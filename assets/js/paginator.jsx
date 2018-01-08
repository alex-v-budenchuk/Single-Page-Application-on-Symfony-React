import React from 'react';
import _ from 'underscore';

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
        this.setFrom(0);
    }
    setPageSize(size) {
        let params = this.getPager(0, size);
        this.props.onPageChanged(params.startIndex, params.endIndex);
        this.setState({ params: params });
    }
    setCount(cnt) {
        let params = this.getPager(0, this.state.params.pageSize, cnt);
        this.props.onPageChanged(params.startIndex, params.endIndex);
        this.setState({ params: params });
    }
    setFrom(from) {
        let params = this.getPager(from);
        this.props.onPageChanged(params.startIndex, params.endIndex);
        this.setState({ params: params });
    }
    getPager(from, pageSize, totalCount) {
        totalCount = totalCount || this.state.params.totalCount;
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

        let firstButton = params.infinite ? null : <li className={params.currentPage === 1 ? 'disabled' : ''}><a onClick={() => this.setFrom(0)}>First</a></li>;
        let lastButton = params.infinite ? null : <li className={params.currentPage === params.totalPages ? 'disabled' : ''}><a onClick={() => this.setFrom((params.totalPages - 1) * params.pageSize)}>Last</a></li>;

        return (
            <div>
                <div className="pagination-container">
                    <ul className="pagination">
                        {firstButton}
                        <li className={params.currentPage === 1 ? 'disabled' : ''}>
                            <a onClick={params.currentPage === 1 ?
                                null
                                : () => this.setFrom(params.startIndex - params.pageSize)
                            }>Previous</a>
                        </li>
                        {params.pages.map((page, index) =>
                            <li key={"page" + index} className={params.currentPage === page ? 'active' : ''} onClick={() => this.setFrom((page - 1) * params.pageSize)}>
                                <a>{page}</a>
                            </li>
                        )}
                        <li className={params.currentPage !== null && params.currentPage === params.totalPages ? 'disabled' : ''}>
                            <a onClick={params.currentPage !== null && params.currentPage === params.totalPages
                                ? null
                                : () => this.setFrom(params.startIndex + params.pageSize)}>Next</a>
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

export default Paginator;