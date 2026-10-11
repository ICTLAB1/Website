/**
 * The page transition, and the reason it is this small.
 *
 * A `template` re-mounts on every navigation where a `layout` would not, which
 * is exactly the hook a route transition needs: the header, the trust bar and
 * the footer live in the layout and stay perfectly still, while the thing that
 * actually changed fades up six pixels.
 *
 * ## Why no exit animation
 *
 * Because there is nowhere honest to put one. The App Router renders the next
 * page when its data is ready; holding the old one on screen to animate it out
 * means delaying the new one, and the brief this was built to is explicit that
 * artificial loading delays are not wanted. An entrance alone reads as a
 * transition and costs nobody a millisecond.
 *
 * ## Why not a library
 *
 * This is one keyframe on one element. The alternative — a client-side
 * animation library wrapping every route — would ship a bundle to every
 * visitor, turn a server-rendered subtree into a client one, and put the whole
 * page behind hydration before it could be seen. The site has nine runtime
 * dependencies and a motion gate that gives it a CLS budget; neither is worth
 * spending here.
 *
 * ## What it cannot break
 *
 * It animates `opacity` and `transform`, so no layout is re-measured and the
 * cumulative layout shift is zero by construction. Under
 * `prefers-reduced-motion` the base layer cuts every animation to 0.01ms, and
 * this keyframe ends at `opacity: 1` with no transform, so reduced motion gets
 * the finished state immediately rather than a hidden page. With CSS but no
 * JavaScript it still runs, because a CSS animation needs neither.
 *
 * The transform does create a containing block while it runs, which would
 * reparent any `position: fixed` descendant. Nothing here is one: the chat
 * widget, the consent banner and the sticky header all render outside `main`,
 * which is what this wraps. The animation also ends on `transform: none`, so
 * the containing block is gone the moment it finishes.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-route-in">{children}</div>;
}
