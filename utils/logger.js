const CALL = Symbol('BaseContextLogger#call');

module.exports = class BaseContextLogger {

  /**
   * @constructor
   * @param {Context} ctx - context instance
   * @since 1.0.0
   */
  constructor(ctx) {
    /**
     * @member {Context} BaseContextLogger#ctx
     * @since 1.2.0
     */
    this.ctx = ctx;
  }

  [CALL](method, ...args) {
    if (!this.ctx.logger) throw new Error(`Use console, please set logger first`);
    if (typeof this.ctx.logger[method] === 'function') {
      this.ctx.logger[method](...args);
    }
  }

  /**
   * @member {Function} BaseContextLogger#debug
   * @since 1.2.0
   */
  debug(...args) {
    this[CALL]('debug', ...args);
  }

  /**
   * @member {Function} BaseContextLogger#info
   * @since 1.2.0
   */
  info(...args) {
    this[CALL]('info', ...args);
  }

  /**
   * @member {Function} BaseContextLogger#warn
   * @since 1.2.0
   */
  warn(...args) {
    this[CALL]('warn', ...args);
  }

  /**
   * @member {Function} BaseContextLogger#error
   * @since 1.2.0
   */
  error(...args) {
    this[CALL]('error', ...args);
  }

  /**
   * @member {Function} BaseContextLogger#log
   * @since 1.2.0
   */
  log(...args) {
    this[CALL]('log', ...args);
  }
}