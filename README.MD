### JSONReader

---

Stream based JSON parser

```javascript
const items = Array.from({ length: 100 }, () => ({
  message: 'hello world from consumers!',
}));
const json = JSON.stringify(items);
const readable = JSONReadable.from(json);
for await (const item of items) {
  console.log(`from readable: ${data.length}`);
}
```

- Select parsing mode by first symbol: '{' or '['
- '{' will generate single chunk
- '[' will generate multiple single chunks by array elements
- Example: receiver [{"name":"Marcus"},{"name":"Luci ... next chunk us",{"name":"Commodus"}]
  - will generate 1st event: {"name":"Marcus"} and save rest in buffer {"name":"Luci
  - after receiving next chink will generate 2nd event: {"name":"Lucius"} and {"name":"Commodus"}
