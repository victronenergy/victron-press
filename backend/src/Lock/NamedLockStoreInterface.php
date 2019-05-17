<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Lock;

interface NamedLockStoreInterface
{
    public function forName(string $name): NamedLockInterface;
}
