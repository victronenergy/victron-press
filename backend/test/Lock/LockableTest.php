<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Test;

use PHPUnit\Framework\TestCase;
use VictronEnergy\Press\Lock\LockableInterface;

abstract class LockableTest extends TestCase
{
    protected const LOCKABLE_USER_ONE = 'user-one';
    protected const LOCKABLE_TTL_SHORT = 4;
    protected const LOCKABLE_USER_TWO = 'user-two';
    protected const LOCKABLE_TTL_LONG = 30;

    /**
     * Provides an new unlocked lockable for use in tests.
     */
    abstract public function getLockable(): LockableInterface;

    public function testInitiallyUnlocked(): LockableInterface
    {
        $lockable = $this->getLockable();
        static::assertFalse($lockable->isLocked(), 'Lockable initially is unlocked.');
        return $lockable;
    }

    /**
     * @depends testInitiallyUnlocked
     */
    public function testUnlocked(LockableInterface $lockable): LockableInterface
    {
        static::assertNull($lockable->lockedBy(), 'Unlocked lockable has NULL as user.');
        static::assertIsInt($lockable->lockedFor(), 'Unlocked lockable has integer TTL.');
        static::assertSame(0, $lockable->lockedFor(), 'Unlocked lockable has 0 as TTL.');
        return $lockable;
    }

    /**
     * @depends testUnlocked
     */
    public function testLock(LockableInterface $lockable): LockableInterface
    {
        static::assertTrue(
            $lockable->lock(static::LOCKABLE_USER_ONE, static::LOCKABLE_TTL_SHORT),
            'Can lock a unlocked lockable.'
        );
        return $lockable;
    }

    /**
     * @depends testLock
     */
    public function testLocked(LockableInterface $lockable): LockableInterface
    {
        static::assertTrue($lockable->isLocked(), 'Locking lockable is locked.');
        static::assertIsString($lockable->lockedBy(), 'Locked lockable has string user.');
        static::assertSame(
            static::LOCKABLE_USER_ONE,
            $lockable->lockedBy(),
            'Locked lockable is locked by correct user.'
        );
        $lockedFor = $lockable->lockedFor();
        static::assertIsInt($lockedFor, 'Locked lockable has integer TTL.');
        static::assertGreaterThan(0, $lockedFor, 'Locked lockable has greater than 0 TTL.');
        static::assertLessThanOrEqual(
            static::LOCKABLE_TTL_SHORT,
            $lockedFor,
            'Locked lockable TTL is less than or equal to entered TTL.'
        );
        return $lockable;
    }

    /**
     * @depends testLocked
     */
    public function testRelock(LockableInterface $lockable): LockableInterface
    {
        static::assertTrue(
            $lockable->lock(static::LOCKABLE_USER_ONE, static::LOCKABLE_TTL_SHORT),
            'Can relock a lockable currently locked by the same user.'
        );
        return $lockable;
    }

    /**
     * @depends testRelock
     */
    public function testRelocked(LockableInterface $lockable): LockableInterface
    {
        static::assertTrue($lockable->isLocked(), 'Relocked lockable is locked.');
        static::assertIsString($lockable->lockedBy(), 'Relocked lockable has string user.');
        static::assertSame(
            static::LOCKABLE_USER_ONE,
            $lockable->lockedBy(),
            'Relocked lockable is locked by correct user.'
        );
        $lockedFor = $lockable->lockedFor();
        static::assertIsInt($lockedFor, 'Relocked lockable has integer TTL.');
        static::assertGreaterThan(0, $lockedFor, 'Relocked lockable has greater than 0 TTL.');
        static::assertLessThanOrEqual(
            static::LOCKABLE_TTL_SHORT,
            $lockedFor,
            'Relocked lockable TTL is less than or equal to entered TTL.'
        );
        return $lockable;
    }

    /**
     * @depends testRelocked
     */
    public function testContendLock(LockableInterface $lockable): LockableInterface
    {
        static::assertFalse(
            $lockable->lock(static::LOCKABLE_USER_TWO, static::LOCKABLE_TTL_LONG),
            'Cannot lock a lockable locked by another user.'
        );
        return $lockable;
    }

    /**
     * @depends testContendLock
     */
    public function testContendedLock(LockableInterface $lockable): LockableInterface
    {
        static::assertTrue($lockable->isLocked(), 'Contended lockable is still locked.');
        static::assertIsString($lockable->lockedBy(), 'Contended lockable still has string user.');
        static::assertSame(
            static::LOCKABLE_USER_ONE,
            $lockable->lockedBy(),
            'Contended lockable is still locked by correct user.'
        );
        $lockedFor = $lockable->lockedFor();
        static::assertIsInt($lockedFor, 'Contended lockable has integer TTL.');
        static::assertGreaterThan(0, $lockedFor, 'Contended lockable has greater than 0 TTL.');
        static::assertLessThanOrEqual(
            static::LOCKABLE_TTL_SHORT,
            $lockedFor,
            'Contended lockable TTL is less than or equal to original entered TTL.'
        );
        return $lockable;
    }

    /**
     * @depends testContendedLock
     */
    public function testUnlock(LockableInterface $lockable): LockableInterface
    {
        $lockable->unlock(static::LOCKABLE_USER_ONE);
        static::assertFalse($lockable->isLocked(), 'After unlocking lockable is unlocked.');
        static::assertNull($lockable->lockedBy(), 'Unlocked lockable has NULL as user.');
        static::assertIsInt($lockable->lockedFor(), 'Unlocked lockable has integer TTL.');
        static::assertSame(0, $lockable->lockedFor(), 'Unlocked lockable has 0 as TTL.');
        return $lockable;
    }

    /**
     * @depends testUnlock
     */
    public function testLockAgain(LockableInterface $lockable): LockableInterface
    {
        static::assertTrue(
            $lockable->lock(static::LOCKABLE_USER_ONE, static::LOCKABLE_TTL_SHORT),
            'Lock lockable again after being unlocked'
        );
        return $lockable;
    }

    /**
     * @depends testLockAgain
     */
    public function testLockedAgain(LockableInterface $lockable): LockableInterface
    {
        static::assertTrue($lockable->isLocked(), 'Locked again lockable is locked.');
        static::assertIsString($lockable->lockedBy(), 'Locked again lockable has string user.');
        static::assertSame(
            static::LOCKABLE_USER_ONE,
            $lockable->lockedBy(),
            'Locked again lockable is locked by correct user.'
        );
        $lockedFor = $lockable->lockedFor();
        static::assertIsInt($lockedFor, 'Locked again lockable has integer TTL.');
        static::assertGreaterThan(0, $lockedFor, 'Locked again lockable has greater than 0 TTL.');
        static::assertLessThanOrEqual(
            static::LOCKABLE_TTL_SHORT,
            $lockedFor,
            'Locked again lockable TTL is less than or equal to entered TTL.'
        );
        return $lockable;
    }

    /**
     * @depends testLockedAgain
     */
    public function testLockTTLDecreases(LockableInterface $lockable): LockableInterface
    {
        static::assertGreaterThanOrEqual(
            3,
            static::LOCKABLE_TTL_SHORT,
            'Configured lock TTL is sufficiently long for testing.'
        );

        $lockedForBefore = $lockable->lockedFor();
        usleep(1500000);
        $lockedForAfter = $lockable->lockedFor();

        static::assertGreaterThanOrEqual(3, $lockedForBefore, 'Lockable has sufficient remaining TTL.');
        static::assertGreaterThan(0, $lockedForAfter, 'Lockable has greater than 0 TTL after sleep.');
        static::assertLessThan($lockedForBefore, $lockedForAfter, 'Lockable TTL has decreased.');
        static::assertGreaterThanOrEqual(
            $lockedForBefore - 2,
            $lockedForAfter,
            'Lockable TTL has not decreased more than a second too much.'
        );
        return $lockable;
    }

    /**
     * @depends testLockTTLDecreases
     */
    public function testRelockSetsTTL(LockableInterface $lockable): LockableInterface
    {
        static::assertGreaterThan(
            static::LOCKABLE_TTL_SHORT,
            self::LOCKABLE_TTL_LONG,
            'Long TTL is greater than short TTL.'
        );

        $lockedForBefore = $lockable->lockedFor();
        $lockable->lock(static::LOCKABLE_USER_ONE, static::LOCKABLE_TTL_SHORT);
        $lockedForAfter = $lockable->lockedFor();

        static::assertGreaterThan(0, $lockedForBefore, 'Lockable had remaining TTL.');
        static::assertLessThan(static::LOCKABLE_TTL_SHORT, $lockedForBefore, 'Lockable was not at maximum TTL.');
        static::assertGreaterThan($lockedForBefore, $lockedForAfter, 'Relocking has increased TTL.');

        $lockedForBefore = $lockable->lockedFor();
        $lockable->lock(static::LOCKABLE_USER_ONE, static::LOCKABLE_TTL_LONG);
        $lockedForAfter = $lockable->lockedFor();

        static::assertGreaterThan(0, $lockedForBefore, 'Lockable had remaining TTL.');
        static::assertLessThan(static::LOCKABLE_TTL_LONG, $lockedForBefore, 'Lockable was not at maximum TTL.');
        static::assertGreaterThan($lockedForBefore, $lockedForAfter, 'Relocking to longer TTL has increased TTL.');

        $lockedForBefore = $lockable->lockedFor();
        $lockable->lock(static::LOCKABLE_USER_ONE, static::LOCKABLE_TTL_SHORT);
        $lockedForAfter = $lockable->lockedFor();

        static::assertGreaterThan(0, $lockedForBefore, 'Lockable had remaining TTL.');
        static::assertGreaterThan(0, $lockedForAfter, 'Lockable has remaining TTL.');
        static::assertGreaterThan(static::LOCKABLE_TTL_SHORT, $lockedForBefore, 'Lockable had long TTL.');
        static::assertLessThan($lockedForBefore, $lockedForAfter, 'Relocking to shorter TTL has decreased TTL.');
        static::assertLessThanOrEqual(
            static::LOCKABLE_TTL_SHORT,
            $lockedForAfter,
            'Relocking to shorter TTL has decreased TTL.'
        );
        return $lockable;
    }

    /**
     * @depends testRelockSetsTTL
     */
    public function testLockExpires(LockableInterface $lockable): LockableInterface
    {
        $lockable->lock(static::LOCKABLE_USER_ONE, 2);
        static::assertTrue($lockable->isLocked(), 'Lockable is locked before expiring.');
        sleep($lockable->lockedFor() + 1);
        static::assertFalse($lockable->isLocked(), 'Lockable is unlocked after expiring.');
        return $lockable;
    }
}
