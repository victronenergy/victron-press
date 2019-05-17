<?php

declare(strict_types=1);

namespace VictronEnergy\Press\Lock;

class PdoLock implements NamedLockInterface
{
    use NamedLockTrait;

    protected $lockStore;

    public function __construct(PdoLockStore $lockStore, string $name)
    {
        $this->lockStore = $lockStore;
        $this->lockName = $name;
    }

    public function isLocked(): bool
    {
        $stmt = $this->lockStore->getPdo()->prepare("
            SELECT
                1
            FROM
                {$this->lockStore->getTable()}
            WHERE
                {$this->lockStore->getNameColumn()} = :name
                AND
                {$this->lockStore->getExpirationColumn()} > {$this->lockStore->getTimestampSql()}
        ");
        $stmt->execute([
            ':name' => $this->lockName,
        ]);
        return (bool) $stmt->fetchColumn(0);
    }

    public function lockedBy(): ?string
    {
        $stmt = $this->lockStore->getPdo()->prepare("
            SELECT (
                SELECT
                    {$this->lockStore->getUserColumn()}
                FROM
                    {$this->lockStore->getTable()}
                WHERE
                    {$this->lockStore->getNameColumn()} = :name
                    AND
                    {$this->lockStore->getExpirationColumn()} > {$this->lockStore->getTimestampSql()}
            )
        ");
        $stmt->execute([
            ':name' => $this->lockName,
        ]);
        return $stmt->fetchColumn(0);
    }

    public function lockedFor(): int
    {
        $stmt = $this->lockStore->getPdo()->prepare("
            SELECT coalesce((
                SELECT
                    {$this->lockStore->getExpirationColumn()} - {$this->lockStore->getTimestampSql()}
                FROM
                    {$this->lockStore->getTable()}
                WHERE
                    {$this->lockStore->getNameColumn()} = :name
                    AND
                    {$this->lockStore->getExpirationColumn()} > {$this->lockStore->getTimestampSql()}
            ), 0)
        ");
        $stmt->execute([
            ':name' => $this->lockName,
        ]);
        return (int) $stmt->fetchColumn(0);
    }

    public function lock(string $user, int $ttl): bool
    {
        if ($ttl < 1) {
            return false;
        }
        $driver = $this->lockStore->getPdo()->getAttribute(\PDO::ATTR_DRIVER_NAME);
        switch ($driver) {
            case 'sqlite':
                $stmt = $this->lockStore->getPdo()->prepare("
                    INSERT OR REPLACE INTO
                        {$this->lockStore->getTable()} (
                            {$this->lockStore->getNameColumn()},
                            {$this->lockStore->getUserColumn()},
                            {$this->lockStore->getExpirationColumn()}
                        )
                    SELECT
                        :name AS name,
                        :user AS user,
                        ({$this->lockStore->getTimestampSql()} + :ttl) AS expiration
                    WHERE
                        NOT EXISTS(
                            SELECT
                                1
                            FROM
                                {$this->lockStore->getTable()}
                            WHERE
                                {$this->lockStore->getNameColumn()} = :name
                                AND
                                {$this->lockStore->getUserColumn()} != :user
                                AND
                                {$this->lockStore->getExpirationColumn()} > {$this->lockStore->getTimestampSql()}
                        )
                ");
                $stmt->execute([
                    ':name' => $this->lockName,
                    ':user' => $user,
                    ':ttl'  => $ttl,
                ]);
                return (bool) $stmt->rowCount();
            default:
                throw new \DomainException(__FUNCTION__ . ' does not support PDO driver "' . $driver . '".');
        }
    }

    public function unlock(string $user): void
    {
        $this->lockStore->getPdo()->prepare("
            DELETE FROM
                {$this->lockStore->getTable()}
            WHERE
                {$this->lockStore->getNameColumn()} = :name
                AND
                {$this->lockStore->getUserColumn()} = :user
        ")->execute([
            ':name' => $this->lockName,
            ':user' => $user,
        ]);
    }
}
