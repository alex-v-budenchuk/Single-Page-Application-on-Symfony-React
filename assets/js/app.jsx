import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import _ from 'underscore';

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
            })).catch(function (error) {
                console.log(error);
            });
    }
    getTracks(start, end) {
        start = start || 0;
        end = end || 9;
        return axios.post('/load-tracks', { start: start, end: end });
    }
    getTracksCount() {
        return axios.post('/get-tracks-count');
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
                        <Filter values={_.union(["< any artist >"], this.state.filters.artists)} />
                        <Filter values={_.union(["< any genre >"], this.state.filters.genres)} />
                        <Filter values={_.union(["< any year >"], this.state.filters.years)} />
                    </div>
                    <div className="main-content">
                        <div className="tracks-table">
                            <div className="tracks-table-heading">
                                <div className="tracks-table-row">
                                    {["Artist", "Name", "Genre", "Year"].map((col) =>
                                        <div className="tracks-table-cell">
                                            <div>
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
    render() {
        return (
            <select className="filter">
                {this.props.values.map((value) =>
                    <option value={value}>{value}</option>
                )}
            </select>
        );
    }
}

class Paginator extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            params: {
                totalCount: this.props.totalCount,
                startIndex: 0,
                endIndex: 9,
                pageSize: 10
            }
        };
    }
    componentWillMount() {
        this.setPage(0);
    }
    setPageSize(size) {
        let params = this.getPager(0, size);
        this.props.onPageChanged(params.startIndex, params.endIndex);
        this.setState({ params: params });
    }
    setPage(from) {
        let params = this.getPager(from);
        this.props.onPageChanged(params.startIndex, params.endIndex);
        this.setState({ params: params });
    }
    getPager(from, pageSize) {
        let totalCount = this.state.params.totalCount;
        pageSize = pageSize !== undefined
            ? pageSize
            : (this.state.params.infinite ? 0 : this.state.params.pageSize);
        let infinite = pageSize === 0;

        if (infinite)
        {
            from = from >= totalCount
                ? from - totalCount
                : from < 0
                    ? totalCount + from
                    : from;

            pageSize = this.state.params.pageSize;

            return {
                totalCount: totalCount,
                infinite: true,
                currentPage: null,
                pageSize: pageSize,
                totalPages: null,
                startPage: null,
                endPage: null,
                startIndex: from,
                endIndex: from + pageSize - 1 <= totalCount
                    ? from + pageSize - 1
                    : from + pageSize - 1 - totalCount,
                pages: []
            };
        }

        let totalPages = Math.ceil(totalCount / pageSize);
        let currentPage = Math.floor( from / pageSize ) + 1;

        let startPage, endPage;
        if (totalPages <= 10) {
            startPage = 1;
            endPage = totalPages;
        } else {
            if (currentPage <= 6) {
                startPage = 1;
                endPage = 10;
            } else if (currentPage + 4 >= totalPages) {
                startPage = totalPages - 9;
                endPage = totalPages;
            } else {
                startPage = currentPage - 5;
                endPage = currentPage + 4;
            }
        }

        let startIndex = (currentPage - 1) * pageSize;
        let endIndex = Math.min(startIndex + pageSize - 1, totalCount - 1);

        let pages = _.range(startPage, endPage + 1);

        return {
            totalCount: totalCount,
            currentPage: currentPage,
            pageSize: pageSize,
            totalPages: totalPages,
            startPage: startPage,
            endPage: endPage,
            startIndex: startIndex,
            endIndex: endIndex,
            pages: pages
        };
    }
    render() {
        let params = this.state.params;
        if (params.pages === undefined)
            return null;

        let firstButton = params.infinite ? null : <li className={params.currentPage === 1 ? 'disabled' : ''}><a onClick={() => this.setPage(0)}>First</a></li>;
        let lastButton = params.infinite ? null : <li className={params.currentPage === params.totalPages ? 'disabled' : ''}><a onClick={() => this.setPage((params.totalPages - 1) * params.pageSize)}>Last</a></li>;

        return (
            <div>
                <div className="pagination-container">
                    <ul className="pagination">
                        {firstButton}
                        <li className={params.currentPage === 1 ? 'disabled' : ''}>
                            <a onClick={() => this.setPage(params.startIndex - params.pageSize)}>Previous</a>
                        </li>
                        {params.pages.map((page, index) =>
                            <li key={"page" + index} className={params.currentPage === page ? 'active' : ''} onClick={() => this.setPage((page - 1) * params.pageSize)}>
                                <a>{page}</a>
                            </li>
                        )}
                        <li className={params.currentPage !== null && params.currentPage === params.totalPages ? 'disabled' : ''}>
                            <a onClick={() => this.setPage(params.startIndex + params.pageSize)}>Next</a>
                        </li>
                        {lastButton}
                    </ul>
                </div>
                <div className="pagination-container right">
                    <ul className="pagination">
                        {[10,20,50,100,0].map((size) =>
                            <li key={"pageSize" + size} className={
                                params.infinite
                                    ? size === 0 ? 'active' : ''
                                    : params.pageSize === size ? 'active' : ''
                            }>
                                <a onClick={() => this.setPageSize(size)}>{size === 0 ? String.fromCharCode(8734) : size}</a>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        );
    }
}

const main = document.getElementById('main');
ReactDOM.render(<App {...(main.dataset)} />, main);