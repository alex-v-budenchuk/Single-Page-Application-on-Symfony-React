<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;

class MusicListController
{
    public function index()
    {
        return new Response('<html><body>test</body></html>');
    }
}
