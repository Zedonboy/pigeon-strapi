/**
 * project router.
 */

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/project/applyProject",
      handler: "project.applyProject",
    },
    {
      method: "GET",
      path: "/projects",
      handler: "project.find",
    },
    {
      method: "POST",
      path: "/projects",
      handler: "project.create",
    },
  ],
};
