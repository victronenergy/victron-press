<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Lock;

class PdoLockStore implements NamedLockStoreInterface
{
    /** @var \PDO */
    protected $pdo;
    /** @var string */
    protected $table = 'locks';
    /** @var string */
    protected $nameColumn = 'name';
    /** @var string */
    protected $userColumn = 'user';
    /** @var string */
    protected $expirationColumn = 'expiration';

    public function __construct(\PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function forName(string $name): NamedLockInterface
    {
        return new PdoLock($this, $name);
    }

    public function createTable(): void
    {
        $driver = $this->pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        switch ($driver) {
            case 'sqlite':
                $this->pdo->exec("
                    CREATE TABLE {$this->table} (
                        {$this->nameColumn} TEXT NOT NULL PRIMARY KEY,
                        {$this->userColumn} TEXT NOT NULL,
                        {$this->expirationColumn} INTEGER NOT NULL
                    )
                ");
                break;
            default:
                throw new \DomainException(__FUNCTION__ . ' does not support PDO driver "' . $driver . '".');
        }
    }

    public function pruneExpiredLocks(): void
    {
        $this->pdo->exec("
            DELETE FROM {$this->table} WHERE {$this->expirationColumn} <= {$this->getTimestampSql()}
        ");
    }

    public function getPdo(): \PDO
    {
        return $this->pdo;
    }

    public function getTable(): string
    {
        return $this->table;
    }

    public function getNameColumn(): string
    {
        return $this->nameColumn;
    }

    public function getUserColumn(): string
    {
        return $this->userColumn;
    }

    public function getExpirationColumn(): string
    {
        return $this->expirationColumn;
    }

    public function getTimestampSql(): string
    {
        switch ($this->pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)) {
            case 'sqlite':
                return "strftime('%s', 'now')";
            default:
                return (string) time();
        }
    }
}
