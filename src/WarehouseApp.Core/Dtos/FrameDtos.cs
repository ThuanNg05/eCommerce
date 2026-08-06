namespace WarehouseApp.Core.Dtos;

/// <summary>A sub-backboard that composes a frame, with its quantity (BOM line).</summary>
public record FrameLineDto(long SubBackboardId, int Quantity);

public record FrameDto(
    long Id,
    int Code,
    string? Description,
    short Status,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<FrameLineDto> Lines);

public record FrameLineRequest(long SubBackboardId, int Quantity);

public record CreateFrameRequest(
    int Code,
    string? Description,
    IReadOnlyList<FrameLineRequest> Lines);

public record UpdateFrameRequest(
    int Code,
    string? Description,
    short Status,
    IReadOnlyList<FrameLineRequest> Lines);
