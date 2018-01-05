'use strict';

/**
 * BaseContextClass is a base class that can be extended,
 * it's instantiated in context level,
 * {@link Helper}, {@link Service} is extending it.
 */
class BaseContextClass {

  /**
   * @constructor
   * @param {Context} ctx - context instance
   * @since 1.0.0
   */
  constructor(ctx) {
    /**
     * @member {Context} BaseContextClass#ctx
     * @since 1.0.0
     */
    this.app = ctx;
    /**
     * @member {Application} BaseContextClass#app
     * @since 1.0.0
     */
    this.base = ctx.base;
    /**
     * @member {Config} BaseContextClass#config
     * @since 1.0.0
     */
    this.config = ctx.base.options;
  }

  get Service() {
    return this.app.Service;
  }

  get logger() {
    return this.base.logger;
  }
}

module.exports = BaseContextClass;