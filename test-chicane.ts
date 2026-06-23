import { createRouter } from "@zoontek/chicane";

const Router = createRouter({
  home: "/",
  options1: "/?:q&:cat&:tag[]&:sort",
  options2: "/?:q&cat&tag[]&sort",
});

console.log("home:", Router.createPath("home", { q: '123', columns: '3' } as any));
console.log("options1:", Router.createPath("options1", { q: '123', cat: 'test', tag: ['a', 'b'] } as any));
console.log("options2:", Router.createPath("options2", { q: '123', cat: 'test', tag: ['a', 'b'] } as any));
