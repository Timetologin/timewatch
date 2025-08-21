// server/middleware/perm.js
module.exports = function hasPermission(key) {
  return (req, res, next) => {
    const p = req.userDoc?.permissions || {};
    if (p[key]) return next();
    return res.status(403).json({ message: 'Permission denied: ' + key });
  };
};

module.exports.any = function hasAnyPermission(...keys) {
  return (req, res, next) => {
    const p = req.userDoc?.permissions || {};
    if (keys.some(k => p[k])) return next();
    return res.status(403).json({ message: 'Permission denied: any of ' + keys.join(', ') });
  };
};
