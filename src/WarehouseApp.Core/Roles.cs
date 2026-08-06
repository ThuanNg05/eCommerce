namespace WarehouseApp.Core;

/// <summary>Account role ids (<see cref="Entities.Account.RoleId"/>). The UI works in the
/// string forms "Admin"/"Staff"; <see cref="Name"/> bridges the two.</summary>
public static class Roles
{
    public const short Admin = 1;
    public const short Staff = 2;

    public static string Name(short roleId) => roleId switch
    {
        Admin => "Admin",
        Staff => "Staff",
        _ => "Unknown",
    };

    public static bool IsValid(short roleId) => roleId is Admin or Staff;
}
