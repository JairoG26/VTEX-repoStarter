const fs = require('fs')
const { parse: parseJsonc } = require('jsonc-parser')
const { buildSchema, parse, validate } = require('graphql')

// TODO 1 y 2: los .jsonc deben parsear sin errores
for (const f of ['store/blocks.jsonc', 'store/interfaces.jsonc']) {
  const errors = []
  parseJsonc(fs.readFileSync(f, 'utf8'), errors)
  console.log(f, errors.length ? errors : 'OK')
}

// TODO 8: la query del front debe ser válida contra el schema
// (declaro @context porque lo agrega VTEX en runtime)
const sdl =
  fs.readFileSync('graphql/schema.graphql', 'utf8') +
  '\ndirective @context(provider: String) on FIELD\n'
const schema = buildSchema(sdl)
const doc = parse(fs.readFileSync('graphql/estimateShipping.graphql', 'utf8'))
const errs = validate(schema, doc)
console.log('graphql', errs.length ? errs.map((e) => e.message) : 'OK')