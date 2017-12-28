<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\Routing\Annotation\Route;
use App\Entity\Track;

class MusicListController extends Controller
{
    /**
     * @Route("/")
     */
    public function index()
    {
        $repository = $this->getDoctrine()->getRepository(Track::class);
        $tracks = $repository->findAll();

        return $this->render('musiclist/index.html.twig', array('tracks' => $tracks));
    }


}
