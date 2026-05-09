module.exports = function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Недостаточно прав' } });
    }
    next();
  };
};
