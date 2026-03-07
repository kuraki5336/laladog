/**
 * Monaco Editor 初始化：Worker 設定 + pm 物件自動補全
 */
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

let initialized = false

export function initMonaco() {
  if (initialized) return
  initialized = true

  self.MonacoEnvironment = {
    getWorker(_: any, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker()
      }
      return new editorWorker()
    },
  }

  // 註冊 pm / CryptoJS / console 的 snippet 補全
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.'],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const lineContent = model.getLineContent(position.lineNumber)
      const textBefore = lineContent.substring(0, position.column - 1)

      const suggestions: monaco.languages.CompletionItem[] = []

      // pm.* 補全
      if (textBefore.endsWith('pm.')) {
        suggestions.push(
          snippet('environment', 'environment', 'pm.environment', range),
          snippet('variables', 'variables', 'pm.variables', range),
          snippet('collectionVariables', 'collectionVariables', 'pm.collectionVariables', range),
          snippet('globals', 'globals', 'pm.globals', range),
          snippet('request', 'request (method, url, headers, body)', 'pm.request', range),
          snippet('response', 'response (status, code, headers, body, json())', 'pm.response', range),
          method('test', 'test("${1:test name}", () => {\n\t${2}\n})', 'pm.test(name, fn)', range),
          method('expect', 'expect(${1:value})', 'pm.expect(value) — Chai assertions', range),
          method('sendRequest', 'sendRequest(${1:"https://"})', 'pm.sendRequest(url|options, callback?) — async HTTP', range),
        )
      }

      // pm.environment.* / pm.variables.* / pm.collectionVariables.* / pm.globals.*
      if (/pm\.(environment|variables|collectionVariables|globals)\.$/.test(textBefore)) {
        suggestions.push(
          method('get', 'get("${1:key}")', 'Get variable value', range),
          method('set', 'set("${1:key}", ${2:value})', 'Set variable value', range),
        )
        if (/pm\.(collectionVariables|globals)\.$/.test(textBefore)) {
          suggestions.push(method('unset', 'unset("${1:key}")', 'Unset variable', range))
        }
      }

      // pm.response.*
      if (textBefore.endsWith('pm.response.')) {
        suggestions.push(
          snippet('status', 'status', 'HTTP status code (number)', range),
          snippet('code', 'code', 'Alias for status', range),
          snippet('statusText', 'statusText', 'Status text (e.g. "OK")', range),
          snippet('headers', 'headers', 'Response headers object', range),
          snippet('body', 'body', 'Response body (string)', range),
          method('json', 'json()', 'Parse body as JSON', range),
        )
      }

      // pm.request.*
      if (textBefore.endsWith('pm.request.')) {
        suggestions.push(
          snippet('method', 'method', 'HTTP method', range),
          snippet('url', 'url', 'Request URL', range),
          snippet('headers', 'headers', 'Request headers object', range),
          snippet('body', 'body', 'Request body (mode, raw, urlencoded, formdata)', range),
        )
      }

      // pm.expect().to.*
      if (/\.to\.$/.test(textBefore)) {
        suggestions.push(
          snippet('be', 'be', 'Chain: .be', range),
          snippet('have', 'have', 'Chain: .have', range),
          snippet('not', 'not', 'Negate assertion', range),
          method('equal', 'equal(${1:expected})', 'Strict equality', range),
          method('eql', 'eql(${1:expected})', 'Deep equality', range),
          method('include', 'include(${1:value})', 'String/array includes', range),
          method('a', 'a("${1:type}")', 'Type check (string, number, array, object)', range),
          method('an', 'an("${1:type}")', 'Type check', range),
        )
      }

      // .to.have.*
      if (/\.have\.$/.test(textBefore)) {
        suggestions.push(
          method('property', 'property("${1:key}")', 'Has property', range),
          method('lengthOf', 'lengthOf(${1:n})', 'Has length', range),
          method('status', 'status(${1:200})', 'Response status code', range),
          method('header', 'header("${1:name}")', 'Response header', range),
          method('keys', 'keys(${1:"key1", "key2"})', 'Has keys', range),
        )
      }

      // .to.be.*
      if (/\.be\.$/.test(textBefore)) {
        suggestions.push(
          snippet('true', 'true', 'Assert truthy', range),
          snippet('false', 'false', 'Assert falsy', range),
          snippet('ok', 'ok', 'Assert truthy', range),
          snippet('null', 'null', 'Assert null', range),
          snippet('empty', 'empty', 'Assert empty', range),
          method('a', 'a("${1:type}")', 'Type check', range),
          method('an', 'an("${1:type}")', 'Type check', range),
          method('above', 'above(${1:n})', 'Greater than', range),
          method('below', 'below(${1:n})', 'Less than', range),
          method('within', 'within(${1:min}, ${2:max})', 'Within range', range),
          method('oneOf', 'oneOf([${1}])', 'One of values', range),
        )
      }

      // 頂層全域補全（不在 . 之後）
      if (!textBefore.endsWith('.')) {
        suggestions.push(
          snippet('pm', 'pm', 'Postman API object', range),
          snippet('console', 'console', 'Console logging', range),
          snippet('CryptoJS', 'CryptoJS', 'Crypto library', range),
          method('atob', 'atob(${1:base64String})', 'Base64 decode', range),
          method('btoa', 'btoa(${1:string})', 'Base64 encode', range),
          snippet('_', '_', 'Lodash utility library', range),
          method('xml2Json', 'xml2Json(${1:xmlString})', 'Parse XML to JSON', range),
        )
      }

      // CryptoJS.*
      if (textBefore.endsWith('CryptoJS.')) {
        suggestions.push(
          method('HmacSHA256', 'HmacSHA256(${1:message}, ${2:key})', 'HMAC-SHA256', range),
          method('HmacSHA1', 'HmacSHA1(${1:message}, ${2:key})', 'HMAC-SHA1', range),
          method('MD5', 'MD5(${1:message})', 'MD5 hash', range),
          method('SHA1', 'SHA1(${1:message})', 'SHA1 hash', range),
          method('SHA256', 'SHA256(${1:message})', 'SHA256 hash', range),
          method('SHA512', 'SHA512(${1:message})', 'SHA512 hash', range),
          method('AES.encrypt', 'AES.encrypt(${1:message}, ${2:key})', 'AES encrypt', range),
          method('AES.decrypt', 'AES.decrypt(${1:ciphertext}, ${2:key})', 'AES decrypt', range),
          snippet('enc', 'enc', 'Encoding utilities (Base64, Hex, Utf8)', range),
        )
      }

      // console.*
      if (textBefore.endsWith('console.')) {
        suggestions.push(
          method('log', 'log(${1})', 'Log message', range),
          method('error', 'error(${1})', 'Log error', range),
          method('warn', 'warn(${1})', 'Log warning', range),
        )
      }

      return { suggestions }
    },
  })
}

function snippet(label: string, insertText: string, detail: string, range: monaco.IRange): monaco.languages.CompletionItem {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText,
    detail,
    range,
  }
}

function method(label: string, insertText: string, detail: string, range: monaco.IRange): monaco.languages.CompletionItem {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Method,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    range,
  }
}
