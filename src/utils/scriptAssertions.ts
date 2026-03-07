/**
 * Chai 風格斷言鏈 — Postman pm.expect 相容實作
 * 支援: .to.be.a('string'), .to.have.property('key'), .to.eql(), .not, etc.
 */

class Assertion {
  private val: any
  private negated: boolean

  constructor(val: any, negated: boolean) {
    this.val = val
    this.negated = negated
  }

  private assert(condition: boolean, message: string): this {
    const pass = this.negated ? !condition : condition
    if (!pass) throw new Error(this.negated ? `Not expected: ${message}` : message)
    return this
  }

  /* ── 語言鏈 (passthrough) ── */
  get to(): this { return this }
  get be(): this { return this }
  get been(): this { return this }
  get is(): this { return this }
  get that(): this { return this }
  get which(): this { return this }
  get and(): this { return this }
  get has(): this { return this }
  get have(): this { return this }
  get with(): this { return this }
  get at(): this { return this }
  get of(): this { return this }
  get same(): this { return this }
  get but(): this { return this }
  get does(): this { return this }
  get still(): this { return this }

  /* ── 否定 ── */
  get not(): Assertion {
    return new Assertion(this.val, !this.negated)
  }

  /* ── 布林 / 型別 getter 斷言 ── */
  get true(): this { return this.assert(this.val === true, `Expected true, got ${JSON.stringify(this.val)}`) }
  get false(): this { return this.assert(this.val === false, `Expected false, got ${JSON.stringify(this.val)}`) }
  get null(): this { return this.assert(this.val === null, `Expected null, got ${JSON.stringify(this.val)}`) }
  get undefined(): this { return this.assert(this.val === undefined, `Expected undefined, got ${JSON.stringify(this.val)}`) }
  get ok(): this { return this.assert(!!this.val, `Expected truthy, got ${JSON.stringify(this.val)}`) }
  get exist(): this { return this.assert(this.val != null, `Expected to exist, got ${JSON.stringify(this.val)}`) }
  get empty(): this {
    const len = this.val?.length ?? Object.keys(this.val ?? {}).length
    return this.assert(len === 0, `Expected empty, got length ${len}`)
  }

  /* ── 相等 ── */
  equal(expected: any): this { return this.assert(this.val === expected, `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(this.val)}`) }
  equals(expected: any): this { return this.equal(expected) }
  eq(expected: any): this { return this.equal(expected) }

  /* ── 深比較 ── */
  eql(expected: any): this {
    return this.assert(
      JSON.stringify(this.val) === JSON.stringify(expected),
      `Expected deep equal to ${JSON.stringify(expected)}, got ${JSON.stringify(this.val)}`,
    )
  }
  eqls(expected: any): this { return this.eql(expected) }

  /* ── 比較 ── */
  above(n: number): this { return this.assert(this.val > n, `Expected > ${n}, got ${this.val}`) }
  gt(n: number): this { return this.above(n) }
  greaterThan(n: number): this { return this.above(n) }

  below(n: number): this { return this.assert(this.val < n, `Expected < ${n}, got ${this.val}`) }
  lt(n: number): this { return this.below(n) }
  lessThan(n: number): this { return this.below(n) }

  least(n: number): this { return this.assert(this.val >= n, `Expected >= ${n}, got ${this.val}`) }
  gte(n: number): this { return this.least(n) }

  most(n: number): this { return this.assert(this.val <= n, `Expected <= ${n}, got ${this.val}`) }
  lte(n: number): this { return this.most(n) }

  within(min: number, max: number): this {
    return this.assert(this.val >= min && this.val <= max, `Expected ${this.val} to be within [${min}, ${max}]`)
  }

  /* ── 包含 ── */
  include(val: any): this {
    if (typeof this.val === 'string') {
      return this.assert(this.val.includes(val), `Expected "${this.val}" to include "${val}"`)
    }
    if (Array.isArray(this.val)) {
      return this.assert(this.val.includes(val), `Expected array to include ${JSON.stringify(val)}`)
    }
    if (typeof this.val === 'object' && this.val !== null) {
      return this.assert(val in this.val, `Expected object to include key "${val}"`)
    }
    return this.assert(false, `Cannot check include on ${typeof this.val}`)
  }
  includes(val: any): this { return this.include(val) }
  contain(val: any): this { return this.include(val) }
  contains(val: any): this { return this.include(val) }

  /* ── 型別檢查 ── */
  a(type: string): this { return this._typeCheck(type) }
  an(type: string): this { return this._typeCheck(type) }

  private _typeCheck(type: string): this {
    const t = type.toLowerCase()
    if (t === 'array') return this.assert(Array.isArray(this.val), `Expected an array, got ${typeof this.val}`)
    if (t === 'object') return this.assert(typeof this.val === 'object' && this.val !== null && !Array.isArray(this.val), `Expected an object, got ${Array.isArray(this.val) ? 'array' : typeof this.val}`)
    if (t === 'null') return this.assert(this.val === null, `Expected null, got ${JSON.stringify(this.val)}`)
    if (t === 'undefined') return this.assert(this.val === undefined, `Expected undefined`)
    if (t === 'nan') return this.assert(Number.isNaN(this.val), `Expected NaN`)
    return this.assert(typeof this.val === t, `Expected a ${t}, got ${typeof this.val}`)
  }

  /* ── 屬性檢查 ── */
  property(name: string, value?: any): this {
    this.assert(name in Object(this.val), `Expected to have property "${name}"`)
    if (arguments.length > 1) {
      this.assert(
        (this.val as any)[name] === value,
        `Expected property "${name}" to be ${JSON.stringify(value)}, got ${JSON.stringify((this.val as any)[name])}`,
      )
    }
    return this
  }

  /* ── 長度 ── */
  lengthOf(n: number): this {
    const len = this.val?.length
    return this.assert(len === n, `Expected length ${n}, got ${len}`)
  }
  length(n: number): this { return this.lengthOf(n) }

  /* ── 鍵 ── */
  keys(...keys: string[]): this {
    const flat = keys.length === 1 && Array.isArray(keys[0]) ? keys[0] : keys
    const objKeys = Object.keys(this.val || {})
    for (const k of flat) {
      this.assert(objKeys.includes(k), `Expected to have key "${k}"`)
    }
    return this
  }
  key(k: string): this { return this.keys(k) }

  /* ── 正則匹配 ── */
  match(re: RegExp): this {
    return this.assert(re.test(String(this.val)), `Expected "${this.val}" to match ${re}`)
  }
  matches(re: RegExp): this { return this.match(re) }

  /* ── oneOf ── */
  oneOf(list: any[]): this {
    return this.assert(list.includes(this.val), `Expected ${JSON.stringify(this.val)} to be one of ${JSON.stringify(list)}`)
  }

  /* ── Response 專用 ── */
  status(code: number): this {
    const actual = this.val?.status ?? this.val?.code
    return this.assert(actual === code, `Expected status ${code}, got ${actual}`)
  }

  header(name: string, value?: string): this {
    const headers = this.val?.headers ?? {}
    const normalized: Record<string, string> = {}
    for (const [k, v] of Object.entries(headers)) {
      normalized[k.toLowerCase()] = v as string
    }
    const found = normalized[name.toLowerCase()]
    this.assert(found !== undefined, `Expected header "${name}" to exist`)
    if (value !== undefined) {
      this.assert(found === value, `Expected header "${name}" to be "${value}", got "${found}"`)
    }
    return this
  }

  /* ── 字串相關 ── */
  string(str: string): this { return this.include(str) }

  /* ── instanceof ── */
  instanceof(ctor: Function): this {
    return this.assert(this.val instanceof ctor, `Expected instanceof ${ctor.name}`)
  }
  instanceOf(ctor: Function): this { return this.instanceof(ctor) }
}

/** 建立 Chai 相容的 expect 斷言 */
export function createExpect(val: any): Assertion {
  return new Assertion(val, false)
}
