function getRouteName() {
  return window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
}

export function createRouter({ root, routes, fallback }) {
  let resolveRoute = (routeName) => routeName;

  const renderRoute = () => {
    const routeName = getRouteName();
    const requestedRoute = routes[routeName] ? routeName : fallback;
    const activeRoute = resolveRoute(requestedRoute);

    if (routeName !== activeRoute) {
      window.location.hash = `#/${activeRoute}`;
      return;
    }

    root.replaceChildren(routes[activeRoute]());
  };

  return {
    refresh: renderRoute,
    setRouteResolver(resolver) {
      resolveRoute = resolver;
    },
    start() {
      window.addEventListener('hashchange', renderRoute);
      renderRoute();
    },
  };
}
