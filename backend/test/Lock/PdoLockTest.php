<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Test;

use VictronEnergy\Press\Lock\PdoLockStore;

/**
 * Tests for the PDO lock.
 *
 * @internal
 */
class PdoLockTest extends NamedLockTest
{
    public function __construct()
    {
        $lockStore = new PdoLockStore(new \PDO('sqlite::memory:'));
        $lockStore->createTable();
        parent::__construct($lockStore);
    }
}
