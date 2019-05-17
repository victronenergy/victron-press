<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Test;

use VictronEnergy\Press\Lock\PdoLockStore;

/**
 * Tests for the PDO lock.
 *
 * @internal
 */
class PdoLockTest extends LockableTest
{
    protected const LOCKABLE_NAME = 'my-resource';

    public function getLockable()
    {
        $this->pdo = new \PDO('sqlite::memory:');
        $this->lockStore = new PdoLockStore($this->pdo);
        $this->lockStore->createTable();
        return $this->lockStore->for(static::LOCKABLE_NAME);
    }

    public function testName(): void
    {
        static::assertSame(static::LOCKABLE_NAME, $this->getLockable()->lockName());
    }
}
