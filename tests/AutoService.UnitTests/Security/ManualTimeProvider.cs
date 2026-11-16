namespace AutoService.UnitTests.Security;

/** A clock that only moves when a test advances it; records the due time of every timer created on it. */
internal sealed class ManualTimeProvider : TimeProvider
{
    private readonly object gate = new();
    private readonly List<ManualTimer> timers = [];
    private readonly List<TimeSpan> dueTimes = [];
    private TimeSpan elapsed;

    public IReadOnlyList<TimeSpan> DueTimes
    {
        get
        {
            lock (gate)
            {
                return dueTimes.ToArray();
            }
        }
    }

    public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
    {
        var timer = new ManualTimer(this, callback, state);
        lock (gate)
        {
            Schedule(timer, dueTime);
            timers.Add(timer);
            dueTimes.Add(dueTime);
        }
        return timer;
    }

    /** Waits until at least the given number of timers were created, for code that schedules from a detached task. */
    public async Task WaitForTimersAsync(int count)
    {
        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (DueTimes.Count < count)
        {
            if (DateTime.UtcNow > deadline)
            {
                throw new TimeoutException($"Expected {count} timers, saw {DueTimes.Count}.");
            }
            await Task.Delay(10);
        }
    }

    public void Advance(TimeSpan by)
    {
        ManualTimer[] due;
        lock (gate)
        {
            elapsed += by;
            due = timers.Where(t => t.DueAt is { } at && at <= elapsed).ToArray();
            foreach (var timer in due)
            {
                timer.DueAt = null;
            }
        }
        foreach (var timer in due)
        {
            timer.Fire();
        }
    }

    private void Remove(ManualTimer timer)
    {
        lock (gate)
        {
            timers.Remove(timer);
        }
    }

    private void Schedule(ManualTimer timer, TimeSpan dueTime)
    {
        lock (gate)
        {
            timer.DueAt = dueTime == Timeout.InfiniteTimeSpan ? null : elapsed + dueTime;
        }
    }

    private sealed class ManualTimer(ManualTimeProvider owner, TimerCallback callback, object? state) : ITimer
    {
        public TimeSpan? DueAt { get; set; }

        public bool Change(TimeSpan dueTime, TimeSpan period)
        {
            owner.Schedule(this, dueTime);
            return true;
        }

        public void Fire() => callback(state);

        public void Dispose() => owner.Remove(this);

        public ValueTask DisposeAsync()
        {
            Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
