import React from 'react';
import ReactDOM from 'react-dom';

class MusicList extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            tracks: []
        };
    }
    render() {
        this.state.tracks = JSON.parse(this.props.tracks).map(t => this.renderTrack(t));
        return (<div>{this.state.tracks}</div>);
    }
    renderTrack(track) {
        return <Track key={track.id} value={track}/>;
    }
}

class Track extends React.Component {
    render() {
        return (<div>{this.props.value.name}</div>);
    }
}

const main = document.getElementById('main');
ReactDOM.render(<MusicList {...(main.dataset)} />, main);