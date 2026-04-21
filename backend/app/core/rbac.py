"""Role-based access control.

Roles:
    admin     — full access
    manager   — oversees operations, reports
    employee  — standard internal user (dispatcher, warehouse staff, etc.)
    driver    — ground transport
    traveler  — person carrying shipment (plane, etc.) — external
    middleman — external facilitator
    customer  — end user
"""
from enum import Enum
from typing import Set


class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"
    DRIVER = "driver"
    TRAVELER = "traveler"
    MIDDLEMAN = "middleman"
    CUSTOMER = "customer"


class Permission(str, Enum):
    # Shipments
    SHIPMENT_CREATE = "shipment:create"
    SHIPMENT_READ_ALL = "shipment:read_all"
    SHIPMENT_READ_OWN = "shipment:read_own"
    SHIPMENT_UPDATE = "shipment:update"
    SHIPMENT_DELETE = "shipment:delete"
    SHIPMENT_SCAN = "shipment:scan"

    # Locations
    LOCATION_MANAGE = "location:manage"
    LOCATION_READ = "location:read"

    # Orders
    ORDER_CREATE = "order:create"
    ORDER_READ_ALL = "order:read_all"
    ORDER_READ_OWN = "order:read_own"
    ORDER_UPDATE = "order:update"

    # Documents
    DOCUMENT_CREATE = "document:create"
    DOCUMENT_READ_ALL = "document:read_all"
    DOCUMENT_READ_OWN = "document:read_own"
    DOCUMENT_APPROVE = "document:approve"

    # Users
    USER_MANAGE = "user:manage"
    USER_READ = "user:read"

    # Inventory
    INVENTORY_READ = "inventory:read"
    INVENTORY_MANAGE = "inventory:manage"


ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.ADMIN: set(Permission),
    Role.MANAGER: {
        Permission.SHIPMENT_CREATE, Permission.SHIPMENT_READ_ALL,
        Permission.SHIPMENT_UPDATE, Permission.SHIPMENT_DELETE,
        Permission.LOCATION_MANAGE, Permission.LOCATION_READ,
        Permission.ORDER_CREATE, Permission.ORDER_READ_ALL, Permission.ORDER_UPDATE,
        Permission.DOCUMENT_CREATE, Permission.DOCUMENT_READ_ALL, Permission.DOCUMENT_APPROVE,
        Permission.USER_READ,
        Permission.INVENTORY_READ, Permission.INVENTORY_MANAGE,
    },
    Role.EMPLOYEE: {
        Permission.SHIPMENT_CREATE, Permission.SHIPMENT_READ_ALL, Permission.SHIPMENT_UPDATE,
        Permission.LOCATION_READ,
        Permission.ORDER_CREATE, Permission.ORDER_READ_ALL, Permission.ORDER_UPDATE,
        Permission.DOCUMENT_CREATE, Permission.DOCUMENT_READ_ALL,
        Permission.INVENTORY_READ, Permission.INVENTORY_MANAGE,
    },
    Role.DRIVER: {
        Permission.SHIPMENT_READ_OWN, Permission.SHIPMENT_SCAN,
        Permission.LOCATION_READ,
    },
    Role.TRAVELER: {
        Permission.SHIPMENT_READ_OWN, Permission.SHIPMENT_SCAN,
        Permission.LOCATION_READ,
    },
    Role.MIDDLEMAN: {
        Permission.SHIPMENT_CREATE, Permission.SHIPMENT_READ_OWN,
        Permission.ORDER_READ_OWN,
        Permission.DOCUMENT_READ_OWN,
    },
    Role.CUSTOMER: {
        Permission.SHIPMENT_READ_OWN,
        Permission.ORDER_CREATE, Permission.ORDER_READ_OWN,
        Permission.DOCUMENT_READ_OWN,
    },
}


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def get_permissions(role: Role) -> Set[Permission]:
    return ROLE_PERMISSIONS.get(role, set())