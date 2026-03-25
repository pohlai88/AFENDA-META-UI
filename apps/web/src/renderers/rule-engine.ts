/**
 * Cross-Module Rule Engine
 * =========================
 * Event-driven business rules that span multiple modules.
 * The brain of enterprise systems.
 */

/**
 * Rule context - unified business graph
 */
export interface RuleContext {
  /** Event that triggered the rule */
  event: string;
  /** Business entities */
  data: {
    customer?: any;
    inventory?: any;
    employee?: any;
    ledger?: any;
    order?: any;
    [key: string]: any;
  };
  /** Authenticated user */
  user: {
    id: string;
    roles: string[];
    permissions: string[];
  };
  /** Request metadata */
  metadata: {
    timestamp: string;
    requestId: string;
    source: string;
  };
}

/**
 * Rule decision
 */
export type RuleDecision = 
  | { type: "allow" }
  | { type: "block"; reason: string }
  | { type: "warn"; message: string }
  | { type: "notify"; channels: string[]; message: string };

/**
 * Rule definition
 */
export interface Rule {
  /** Unique rule ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Event pattern to match */
  when: string | RegExp;
  /** Condition function */
  if: (ctx: RuleContext) => boolean | Promise<boolean>;
  /** Action to take */
  then: (ctx: RuleContext) => RuleDecision | Promise<RuleDecision>;
  /** Priority (higher = runs first) */
  priority?: number;
  /** Is this rule active? */
  enabled?: boolean;
}

/**
 * DSL-based rule definition
 */
export interface RuleDSL {
  when: string;
  if: string; // Expression like "customer.creditLimit < order.total"
  then: Array<"block" | "allow" | "notify.finance" | string>;
}

/**
 * Rule execution result
 */
export interface RuleExecutionResult {
  ruleId: string;
  decision: RuleDecision;
  executedAt: string;
  duration: number;
  context: RuleContext;
}

/**
 * Rule audit log entry
 */
export interface RuleAuditLog extends RuleExecutionResult {
  inputs: Record<string, any>;
}

/**
 * Expression evaluator for DSL
 */
function evaluateExpression(expr: string, ctx: RuleContext): boolean {
  // Simple expression evaluator
  // In production, use a proper DSL parser like filtrex or expr-eval
  try {
    const func = new Function("ctx", `with(ctx.data) { return ${expr}; }`);
    return func(ctx);
  } catch (error) {
    console.error(`[Rules] Failed to evaluate expression: ${expr}`, error);
    return false;
  }
}

/**
 * Rule Engine
 */
class RuleEngine {
  private rules = new Map<string, Rule>();
  private auditLogs: RuleAuditLog[] = [];
  private maxAuditLogs = 10000;
  
  /**
   * Register a rule
   */
  register(rule: Rule): void {
    this.rules.set(rule.id, rule);
    console.log(`[Rules] Registered: ${rule.id} - ${rule.name}`);
  }
  
  /**
   * Register rule from DSL
   */
  registerDSL(id: string, name: string, dsl: RuleDSL): void {
    const rule: Rule = {
      id,
      name,
      description: `DSL rule: ${dsl.when}`,
      when: dsl.when,
      if: (ctx) => evaluateExpression(dsl.if, ctx),
      then: async (ctx) => {
        // Execute actions from DSL
        for (const action of dsl.then) {
          if (action === "block") {
            return { type: "block", reason: "Rule blocked this action" };
          } else if (action === "allow") {
            return { type: "allow" };
          } else if (action.startsWith("notify.")) {
            const channel = action.split(".")[1];
            return { 
              type: "notify", 
              channels: [channel], 
              message: "Rule triggered notification" 
            };
          }
        }
        return { type: "allow" };
      },
    };
    
    this.register(rule);
  }
  
  /**
   * Find rules matching an event
   */
  private findMatchingRules(event: string): Rule[] {
    return Array.from(this.rules.values())
      .filter(rule => {
        if (rule.enabled === false) return false;
        
        if (typeof rule.when === "string") {
          return rule.when === event;
        } else {
          return rule.when.test(event);
        }
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  /**
   * Execute rules for an event
   */
  async execute(event: string, ctx: RuleContext): Promise<RuleExecutionResult[]> {
    const matchingRules = this.findMatchingRules(event);
    
    if (matchingRules.length === 0) {
      console.log(`[Rules] No rules matched event: ${event}`);
      return [];
    }
    
    console.log(`[Rules] Executing ${matchingRules.length} rules for event: ${event}`);
    
    const results: RuleExecutionResult[] = [];
    
    for (const rule of matchingRules) {
      const startTime = Date.now();
      
      try {
        // Check condition
        const conditionMet = await rule.if(ctx);
        
        if (!conditionMet) {
          console.log(`[Rules] ${rule.id} condition not met`);
          continue;
        }
        
        // Execute action
        const decision = await rule.then(ctx);
        const duration = Date.now() - startTime;
        
        const result: RuleExecutionResult = {
          ruleId: rule.id,
          decision,
          executedAt: new Date().toISOString(),
          duration,
          context: ctx,
        };
        
        results.push(result);
        
        // Audit log
        this.auditLog(result);
        
        console.log(`[Rules] ${rule.id} executed in ${duration}ms:`, decision);
        
        // If rule blocks, stop execution
        if (decision.type === "block") {
          break;
        }
      } catch (error) {
        console.error(`[Rules] Error executing ${rule.id}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Add to audit log
   */
  private auditLog(result: RuleExecutionResult): void {
    const log: RuleAuditLog = {
      ...result,
      inputs: {
        event: result.context.event,
        userId: result.context.user.id,
        data: Object.keys(result.context.data),
      },
    };
    
    this.auditLogs.push(log);
    
    // Trim logs if too many
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs = this.auditLogs.slice(-this.maxAuditLogs);
    }
  }
  
  /**
   * Get audit logs
   */
  getAuditLogs(filter?: {
    ruleId?: string;
    event?: string;
    decision?: RuleDecision["type"];
    since?: Date;
  }): RuleAuditLog[] {
    let logs = this.auditLogs;
    
    if (filter?.ruleId) {
      logs = logs.filter(log => log.ruleId === filter.ruleId);
    }
    
    if (filter?.event) {
      logs = logs.filter(log => log.context.event === filter.event);
    }
    
    if (filter?.decision) {
      logs = logs.filter(log => log.decision.type === filter.decision);
    }
    
    if (filter?.since) {
      logs = logs.filter(log => new Date(log.executedAt) >= filter.since!);
    }
    
    return logs;
  }
  
  /**
   * Get rule statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    totalExecutions: number;
    blockedActions: number;
    averageExecutionTime: number;
  } {
    const activeRules = Array.from(this.rules.values()).filter(r => r.enabled !== false).length;
    const blockedActions = this.auditLogs.filter(log => log.decision.type === "block").length;
    const avgTime = this.auditLogs.reduce((sum, log) => sum + log.duration, 0) / this.auditLogs.length;
    
    return {
      totalRules: this.rules.size,
      activeRules,
      totalExecutions: this.auditLogs.length,
      blockedActions,
      averageExecutionTime: avgTime || 0,
    };
  }
  
  /**
   * Enable/disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      console.log(`[Rules] ${ruleId} ${enabled ? "enabled" : "disabled"}`);
    }
  }
  
  /**
   * Remove a rule
   */
  unregister(ruleId: string): void {
    this.rules.delete(ruleId);
    console.log(`[Rules] Unregistered: ${ruleId}`);
  }
  
  /**
   * List all rules
   */
  listRules(): Rule[] {
    return Array.from(this.rules.values());
  }
}

/**
 * Global rule engine instance
 */
export const ruleEngine = new RuleEngine();

/**
 * Convenience: Register a simple rule
 */
export function on(
  event: string,
  condition: (ctx: RuleContext) => boolean | Promise<boolean>,
  action: (ctx: RuleContext) => RuleDecision | Promise<RuleDecision>
): void {
  const id = `${event}-${Date.now()}`;
  ruleEngine.register({
    id,
    name: id,
    description: `Rule for ${event}`,
    when: event,
    if: condition,
    then: action,
  });
}

/**
 * Helper: Block action
 */
export function Block(reason: string): RuleDecision {
  return { type: "block", reason };
}

/**
 * Helper: Allow action
 */
export function Allow(): RuleDecision {
  return { type: "allow" };
}

/**
 * Helper: Notify channels
 */
export function Notify(channels: string[], message: string): RuleDecision {
  return { type: "notify", channels, message };
}
