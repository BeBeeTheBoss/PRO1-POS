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

    public function test_application_shell_is_locked_to_light_mode(): void
    {
        $template = file_get_contents(resource_path('views/app.blade.php'));

        $this->assertIsString($template);
        $this->assertStringContainsString('color-scheme: light', $template);
        $this->assertStringNotContainsString('prefers-color-scheme: dark', $template);
        $this->assertStringNotContainsString("classList.add('dark')", $template);
    }
}
