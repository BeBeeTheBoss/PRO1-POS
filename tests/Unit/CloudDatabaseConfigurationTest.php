<?php

namespace Tests\Unit;

use Tests\TestCase;

class CloudDatabaseConfigurationTest extends TestCase
{
    public function test_cloud_postgresql_connection_is_registered(): void
    {
        $connection = config('database.connections.cloud');

        $this->assertIsArray($connection);
        $this->assertSame('pgsql', $connection['driver']);
        $this->assertArrayHasKey('host', $connection);
        $this->assertArrayHasKey('port', $connection);
        $this->assertArrayHasKey('database', $connection);
        $this->assertArrayHasKey('username', $connection);
        $this->assertArrayHasKey('password', $connection);
        $this->assertSame('public', $connection['search_path']);
    }
}
