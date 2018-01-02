const tree = {
  b: {
    deps: ['a']
  },
  m: {
    deps: ['a', 'b', 'h']
  },
  a: {
    deps: []
  },
  c: {
    deps: ['a']
  },
  h: {
    deps:['c']
  }
}

const s = Object.keys(tree);
let j = s.length;
while (j--) {
  const obj = tree[s[j]];

  Object.defineProperty(obj, 'deep', {
    get() {
      if (!obj.deps.length) return 0;
      return Math.max(...obj.deps.map(d => tree[d].deep)) + 1
    }
  });
}

for (const i in tree) {
  console.log(i, tree[i].deep);
}