<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Lock;

interface LockableInterface
{
    /**
     * @return bool whether this resource is currently locked
     */
    public function isLocked(): bool;

    /**
     * @return string the user which currently holds the lock for this resource,
     *                or NULL if this resource is not currently locked
     */
    public function lockedBy(): ?string;

    /**
     * @return int number of seconds until the lock for this resource expires,
     *             or 0 if this resource is not currently locked
     */
    public function lockedFor(): int;

    /**
     * Tries to lock this resource by the given user for the given time.
     *
     * @param string $user the user to lock this resource for
     * @param int    $ttl  time in seconds until the lock for this resource should expire
     *
     * @return bool whether this resource is now locked by the given user
     */
    public function lock(string $user, int $ttl): bool;

    /**
     * Releases the lock for this resource if it was held by the given user.
     *
     * @param string $user the user for which to release its lock on this resource
     */
    public function unlock(string $user): void;
}
