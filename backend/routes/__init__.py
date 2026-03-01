"""
Routes package for Solar Empire API
Import all route modules here
"""
from routes.legal import router as legal_router
from routes.referrals import router as referrals_router
from routes.chat import router as chat_router
from routes.testimonials import router as testimonials_router
from routes.competitors import router as competitors_router
from routes.leads import router as leads_router
from routes.territories import router as territories_router
from routes.reps import router as reps_router
from routes.appointments import router as appointments_router
from routes.analytics import router as analytics_router
from routes.lead_hunter import router as lead_hunter_router
from routes.scan_results import router as scan_results_router
from routes.notifications import router as notifications_router
from routes.integrations import router as integrations_router
from routes.lead_scoring import router as lead_scoring_router
from routes.elite_tools import router as elite_tools_router
from routes.ai_power_tools import router as ai_power_tools_router
from routes.intelligence_tools import router as intelligence_tools_router
from routes.admin import router as admin_router
from routes.admin_auth import router as admin_auth_router
from routes.two_factor_auth import router as two_factor_auth_router
from routes.organizations import router as organizations_router

__all__ = [
    'legal_router',
    'referrals_router', 
    'chat_router',
    'testimonials_router',
    'competitors_router',
    'leads_router',
    'territories_router',
    'reps_router',
    'appointments_router',
    'analytics_router',
    'lead_hunter_router',
    'scan_results_router',
    'notifications_router',
    'integrations_router',
    'lead_scoring_router',
    'elite_tools_router',
    'ai_power_tools_router',
    'intelligence_tools_router',
    'admin_router',
    'admin_auth_router',
    'two_factor_auth_router',
    'organizations_router'
]
