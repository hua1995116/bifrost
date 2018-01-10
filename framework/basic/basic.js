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
    this.app = ctx.app;
    /**
     * @member {Application} BaseContextClass#app
     * @since 1.0.0
     */
    this.base = ctx;
    this.type = 'basic';
  }

  async fetch(...args) {
    return await this.base.fetch(...args);
  }
}

module.exports = BaseContextClass;