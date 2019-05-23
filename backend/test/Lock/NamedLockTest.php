<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Test;

use VictronEnergy\Press\Lock\LockableInterface;
use VictronEnergy\Press\Lock\NamedLockStoreInterface;

abstract class NamedLockTest extends LockableTest
{
    protected const LOCKABLE_NAME = 'my-resource';

    /** @var NamedLockStoreInterface */
    protected $lockStore;

    protected function __construct(NamedLockStoreInterface $lockStore)
    {
        $this->lockStore = $lockStore;
        parent::__construct();
    }

    public function getLockable(): LockableInterface
    {
        return $this->lockStore->forName(bin2hex(random_bytes(32)));
    }

    public function testName(): void
    {
        static::assertSame(
            static::LOCKABLE_NAME,
            $this->lockStore->forName(static::LOCKABLE_NAME)->lockName(),
            'Locked name is correct.'
        );
    }

    public function testSynchronized(): void
    {
        $lockOne = $this->lockStore->forName(static::LOCKABLE_NAME);
        $lockTwo = $this->lockStore->forName(static::LOCKABLE_NAME);

        static::assertSame($lockOne->isLocked(), $lockTwo->isLocked(), 'Locks have same initial state.');
        static::assertSame($lockOne->lockedBy(), $lockTwo->lockedBy(), 'Locks have same initial user.');
        static::assertSame($lockOne->lockedFor(), $lockTwo->lockedFor(), 'Locks have same initial TTL.');
        static::assertSame($lockOne->lockName(), $lockTwo->lockName(), 'Locks have same initial name.');

        static::assertTrue(
            $lockOne->lock(static::LOCKABLE_USER_ONE, static::LOCKABLE_TTL_SHORT),
            'Lock can be locked.'
        );

        static::assertSame($lockOne->isLocked(), $lockTwo->isLocked(), 'Locks have same locked state.');
        static::assertSame($lockOne->lockedBy(), $lockTwo->lockedBy(), 'Locks have same locked user.');
        static::assertSame($lockOne->lockedFor(), $lockTwo->lockedFor(), 'Locks have same locked TTL.');
        static::assertSame($lockOne->lockName(), $lockTwo->lockName(), 'Locks have same locked name.');

        $lockTwo->unlock(static::LOCKABLE_USER_ONE);

        static::assertSame($lockOne->isLocked(), $lockTwo->isLocked(), 'Locks have same unlocked state.');
        static::assertSame($lockOne->lockedBy(), $lockTwo->lockedBy(), 'Locks have same unlocked user.');
        static::assertSame($lockOne->lockedFor(), $lockTwo->lockedFor(), 'Locks have same unlocked TTL.');
        static::assertSame($lockOne->lockName(), $lockTwo->lockName(), 'Locks have same unlocked name.');
    }
}
