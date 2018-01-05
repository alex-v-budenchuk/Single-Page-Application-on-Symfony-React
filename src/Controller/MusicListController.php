<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

use App\Entity\Track;

class MusicListController extends Controller
{
    private $musixmatchApiKey;

    public function __construct()
    {
        $this->musixmatchApiKey = $_ENV['MUSIXMATCH_APIKEY'];
    }

    /**
     * @Route("/", name="index")
     */
    public function index()
    {
        return $this->render('musiclist/index.html.twig');
    }

    /**
     * @Route("/load-tracks", name="load_tracks")
     */
    public function loadTracks(Request $request)
    {
        $params = json_decode($request->getContent(), true);
        $offset = $params['start'];
        $limit = $params['end'] + 1 - $offset;

        $repository = $this->getDoctrine()->getRepository(Track::class);
        $tracks = $repository->findBy([], null, $limit, $offset);

        return new JsonResponse($tracks);
    }

    /**
     * @Route("/get-tracks-count", name="get_tracks_count")
     */
    public function getTracksCount()
    {
        $repository = $this->getDoctrine()->getRepository(Track::class);
        return new JsonResponse($repository->count([]));
    }

    /**
     * @Route("/fill", name="fill_db")
     */
    public function fillDB()
    {
        $em = $this->getDoctrine()->getManager();

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $urlPattern = 'http://api.musixmatch.com/ws/1.1/%s&apikey=' . $this->musixmatchApiKey;

        foreach ([ 'Bob Dylan', 'The Beatles', 'The Rolling Stones', 'Robert Nesta "Bob" Marley', 'Aerosmith' ] as $artist) {
            // Get an artist id
            curl_setopt($ch, CURLOPT_URL, sprintf($urlPattern, 'artist.search?q_artist=' . rawurlencode($artist) . '&page_size=1'));
            $response = curl_exec($ch);
            $artistId = json_decode($response, true)['message']['body']['artist_list'][0]['artist']['artist_id'];

            // Get 100 tracks of the artist
            $tracksCount = 0;

            // Get all artist albums
            curl_setopt($ch, CURLOPT_URL, sprintf($urlPattern, 'artist.albums.get?artist_id=' . $artistId . '&page_size=100'));
            $response = curl_exec($ch);
            foreach (json_decode($response, true)['message']['body']['album_list'] as $album) {
                if ($tracksCount >= 100)
                    break;

                // Get all tracks of an album
                curl_setopt($ch, CURLOPT_URL, sprintf($urlPattern, 'album.tracks.get?album_id=' . $album['album']['album_id'] . '&page_size=100'));
                $response = curl_exec($ch);
                foreach (json_decode($response, true)['message']['body']['track_list'] as $track) {
                    if ($tracksCount >= 100)
                        break;

                    // Insert a track to the DB
                    $dbTrack = new Track();
                    try {
                        $dbTrack->setName($track['track']['track_name']);
                        $dbTrack->setArtist($track['track']['artist_name']);
                        $dbTrack->setGenre($track['track']['primary_genres']['music_genre_list'][0]['music_genre']['music_genre_name']);
                        $date = \DateTime::createFromFormat("Y-m-d\TH:i:s\Z", $track['track']['first_release_date']);
                        // TODO: handle FatalThrowableError with terminateWithException
                        if ($date !== false)
                            $dbTrack->setYear($date->format('Y'));
                        $dbTrack->setDuration($track['track']['track_length']);

                        if (!$em->isOpen()) {
                            $em = $em->create(
                                $em->getConnection(),
                                $em->getConfiguration()
                            );
                        }
                        $em->persist($dbTrack);
                        $em->flush();

                        $tracksCount++;
                    } catch (\Exception $e) {
                        // TODO: Log duplication or other error
                    }
                }
            }
        }
    }
}
