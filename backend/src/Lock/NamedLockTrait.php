<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Lock;

trait NamedLockTrait
{
    /**
     * @var string name of this lock
     */
    protected $lockName;

    public function lockName(): string
    {
        return $this->lockName;
    }
}
