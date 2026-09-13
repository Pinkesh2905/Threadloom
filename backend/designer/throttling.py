from rest_framework.throttling import UserRateThrottle


class DesignSaveThrottle(UserRateThrottle):
    """Caps how often one user can create/update designs — protects the
    save endpoint from being hammered by a runaway autosave loop or a
    scripted client, independent of any specific autosave feature."""

    scope = 'design-save'
