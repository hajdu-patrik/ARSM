using AutoService.ApiService.Storage;
using AutoService.UnitTests.Security;
using Microsoft.Extensions.Logging;

namespace AutoService.UnitTests.Storage;

/** The best-effort delete of a stored profile picture after a profile or mechanic delete (L22). */
public sealed class ProfilePictureObjectCleanupTests
{
    private sealed class FakeStorage : IProfilePictureStorage
    {
        public List<string> Deleted { get; } = [];

        public Exception? FailWith { get; set; }

        public Task DeleteAsync(string objectKey, CancellationToken cancellationToken)
        {
            Deleted.Add(objectKey);
            return FailWith is null ? Task.CompletedTask : Task.FromException(FailWith);
        }

        public Task<string> SaveAsync(int personId, byte[] content, string contentType, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<Stream?> OpenReadAsync(string objectKey, CancellationToken cancellationToken)
            => throw new NotSupportedException();

        public Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken cancellationToken)
            => throw new NotSupportedException();
    }

    [Fact]
    public async Task TryDeleteAsync_deletes_the_object_key()
    {
        var storage = new FakeStorage();

        await ProfilePictureObjectCleanup.TryDeleteAsync(storage, "people/7/pic.webp", new RecordingLogger());

        Assert.Equal(["people/7/pic.webp"], storage.Deleted);
    }

    [Fact]
    public async Task TryDeleteAsync_does_nothing_without_a_key()
    {
        var storage = new FakeStorage();

        await ProfilePictureObjectCleanup.TryDeleteAsync(storage, null, new RecordingLogger());

        Assert.Empty(storage.Deleted);
    }

    [Fact]
    public async Task TryDeleteAsync_swallows_a_storage_failure_and_logs_a_warning()
    {
        var storage = new FakeStorage { FailWith = new InvalidOperationException("bucket down") };
        var logger = new RecordingLogger();

        await ProfilePictureObjectCleanup.TryDeleteAsync(storage, "people/7/pic.webp", logger);

        var entry = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Contains("people/7/pic.webp", entry.Message);
        Assert.IsType<InvalidOperationException>(entry.Exception);
    }
}
