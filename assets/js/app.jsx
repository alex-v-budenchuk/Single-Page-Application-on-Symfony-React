import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import _ from 'underscore';

import Paginator from './paginator';

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            filters: JSON.parse(props.filterValues),
            tracks: [],
            totalCount: 0,
            startIndex: 0,
            endIndex: 0
        };

        this.filters = [
            { name: "artist", value: null },
            { name: "genre", value: null },
            { name: "year", value: null }
        ];
        this.sort = {
            by: null,
            order: null
        };

        this.onFilterChanged = this.onFilterChanged.bind(this);
        this.onPageChanged = this.onPageChanged.bind(this);

        this.init();
    }
    init() {
        let self = this;
        axios.all([this.getTracksCount(), this.getTracks()])
            .then(axios.spread(function(cntData, tracksData) {
                self.setState({
                    tracks: _.map(tracksData.data, (t, i) => { return { key: i, value: t } }),
                    totalCount: cntData.data
                });
                self.refs.paginator.setCount(cntData.data);
            })).catch(function (error) {
                console.log(error);
            });
    }
    getTracks(start, end) {
        start = start || 0;
        end = end || 9;
        return axios.post('/load-tracks', {
            filters: _.filter(this.filters, function(f) { return f.value !== null }),
            sortBy: this.sort.by,
            sortOrder: this.sort.order,
            start: start,
            end: end });
    }
    getTracksCount() {
        return axios.post('/get-tracks-count', {
            filters: _.filter(this.filters, function(f) { return f.value !== null })
        });
    }

    sortBy(col) {
        let sortOrder = col === this.state.sortBy && this.state.sortOrder === "ASC"
            ? "DESC"
            : "ASC";
        this.sort = {
            order: this.sort.by && this.sort.order === "ASC"
                ? "DESC"
                : "ASC",
            by: col
        };
        this.init();
    }

    onFilterChanged(filter, value) {
        _.findWhere(this.filters, { name: filter }).value = value === "" ? null : value;

        this.init();
    }

    onPageChanged(start, end) {
        let tracks = this.state.tracks;
        if (!this.allTracksLoaded(tracks, start, end)) {
            let self = this;
            let endToLoad = end < start
                ? this.state.totalCount - 1
                : end;
            this.getTracks(start, endToLoad).then(function(r) {
                tracks = self.mergeTracks(tracks, _.object(_.range(start, endToLoad + 1), r.data));
                self.setState({ tracks: tracks, startIndex: start, endIndex: end });
            });
        } else
            this.setState({ startIndex: start, endIndex: end });
    }

    allTracksLoaded(tracks, start, end) {
        end = end < start
            ? this.state.totalCount - 1
            : end;
        return _.filter(tracks, function(t) { return _.contains(_.range(start, end + 1), t.key); }).length === _.range(start, end + 1).length
    }

    mergeTracks(tracks1, tracks2) {
        return _.uniq(_.union(tracks1, _.map(tracks2, (t, i) => { return { key: parseInt(i), value: t } })), function(item) {return item.key;});
    }

    render() {
        let tracks = this.state.tracks;
        if (tracks.length === 0)
            return null;

        let startIndex = this.state.startIndex;
        let endIndex = this.state.endIndex;
        let shownTracks = _.sortBy(_.filter(tracks, function(t) {
            return startIndex < endIndex
                ? t.key >= startIndex && t.key <= endIndex
                : t.key >= startIndex || t.key <= endIndex
        }), function(t) { return t.key < startIndex; });

        return (<div className="container">
                    <div className="filters">
                        <Filter values={this.state.filters.artists} name="artist" onChanged={this.onFilterChanged} />
                        <Filter values={this.state.filters.genres}  name="genre" onChanged={this.onFilterChanged} />
                        <Filter values={this.state.filters.years} name="year" onChanged={this.onFilterChanged} />
                    </div>
                    <div className="main-content">
                        <div className="tracks-table">
                            <div className="tracks-table-heading">
                                <div className="tracks-table-row">
                                    {["Artist", "Name", "Genre", "Year"].map((col) =>
                                        <div key={"col" + col} className="tracks-table-cell" onClick={() => this.sortBy(col)}>
                                            <div className={
                                                this.sort.by === col && this.sort.order === "ASC"
                                                    ? "arrows down"
                                                    : this.sort.by === col && this.sort.order === "DESC"
                                                        ? "arrows up"
                                                        : "arrows"
                                            }>
                                                <div className="arrow up"></div>
                                                <div className="arrow down"></div>
                                            </div>
                                            <div>{col}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="tracks-table-body">
                                {shownTracks.map((track) => this.renderTrack(track.value))}
                            </div>
                        </div>
                        <Paginator
                            ref="paginator"
                            totalCount={this.state.totalCount}
                            onPageChanged={this.onPageChanged}
                        />
                    </div>
                </div>
            );
    }
    renderTrack(track) {
        return <Track key={track.id} value={track}/>;
    }
}

class Track extends React.Component {
    render() {
        return (
            <div className="tracks-table-row">
                <div className="tracks-table-cell">{this.props.value.artist}</div>
                <div className="tracks-table-cell">{this.props.value.name}</div>
                <div className="tracks-table-cell">{this.props.value.genre}</div>
                <div className="tracks-table-cell">{this.props.value.year}</div>
            </div>
        );
    }
}

class Filter extends React.Component {
    onChange(self, event) {
        self.props.onChanged(self.props.name, event.target.value);
    }
    render() {
        return (
            <select key={"filter"+this.props.name} className="filter" onChange={(e) => this.onChange(this, e)} >
                <option key={"filter"+this.props.name+"Any"} value="">{"< any " + this.props.name + " >"}</option>
                {this.props.values.map((value) =>
                    <option key={"filter"+this.props.name +value} value={value}>{value}</option>
                )}
            </select>
        );
    }
}

const main = document.getElementById('main');
ReactDOM.render(<App {...(main.dataset)} />, main);