"""
Security module for Solar Empire
Contains Two-Factor Authentication and other security features.
"""

from security.two_factor_auth import TwoFactorAuth, two_factor_auth

__all__ = ['TwoFactorAuth', 'two_factor_auth']
