// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/middleware/auth.js
// Description: Express Session Authentication & RBAC Middleware
// =============================================================================

function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to access this resource.'
    });
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.user) {
        if (req.session.user.role === 'admin') {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: 'Forbidden. Admin privileges required.'
        });
    }
    return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
    });
}

module.exports = {
    requireAuth,
    requireAdmin
};

