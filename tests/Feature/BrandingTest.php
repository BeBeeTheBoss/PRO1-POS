<?php

namespace Tests\Feature;

use Tests\TestCase;

class BrandingTest extends TestCase
{
    public function test_shared_pro1_logo_asset_exists(): void
    {
        $this->assertFileExists(
            public_path('images/pro1-global-home-center.png'),
        );
    }
}
