<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Lock;

interface NamedLockInterface extends LockableInterface
{
    /**
     * @return string name of this lock
     */
    public function lockName(): string;
}
