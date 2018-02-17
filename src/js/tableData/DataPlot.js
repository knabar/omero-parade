
import React, { Component } from 'react';
import ImageIcon from '../dataset/ImageIcon';
import { getHeatmapColor } from '../util';

const styles = {
    xAxisSelect: {
        position: 'absolute',
        right: '40%',
        top: '100%',
    },
    yAxisSelect: {
        position: 'absolute',
        right: '100%',
        top: '50%',
        transform: 'rotate(-90deg)',
    },
}
export default React.createClass({

    getInitialState: function() {
        return {
            xAxisName: undefined,
            yAxisName: undefined,
            selectedImageIds: [],
        }
    },

    setAxisName: function(axis, event, otherAxis) {
        // Set BOTH axis names.
        // Since we start with both undefined, as soon as
        // user picks one to change, we set both.
        let name = event.target.value;
        if (axis === 'x') {
            this.setState({xAxisName: name, yAxisName: otherAxis});
        } else {
            this.setState({yAxisName: name, xAxisName: otherAxis});
        }
    },

    componentDidMount: function() {
        // var jstree = this.props.jstree;
        $(this.refs.thumb_plot_canvas).selectable({
            filter: 'img',
            distance: 2,
            stop: () => {
                // TODO: If Dataset Images.... make the same selection in the jstree etc
                console.log('stop...')
                let imageIds = [];
                let wellIds = [];
                $(".ui-selected").each(function(){
                    imageIds.push(parseInt($(this).attr('data-id'), 10));
                    if ($(this).attr('data-wellId')) {
                        wellIds.push(parseInt($(this).attr('data-wellId'), 10));
                    }
                });
                console.log('wellIds, imageIds', wellIds, imageIds);
                if (wellIds.length > 0) {
                    this.setSelectedWells(wellIds);
                } else {
                    this.setState({selectedImageIds: imageIds});
                }
            },
            start: () => {
                this.setState({selectedImageIds: []});
            }
        });
    },

    componentWillUnmount: function() {
        // cleanup plugin
        $(this.refs.dataIcons).selectable( "destroy" );
    },

    setSelectedWells: function(wellIds) {

        this.setState({selectedImageIds: wellIds});

        var well_index = this.props.fieldId;
        var selected_objs = wellIds.map(wId => ({id: 'well-' + wId, index: this.props.fieldId}))
        $("body")
            .data("selected_objects.ome", selected_objs)
            .trigger("selection_change.ome");
        // Update the buttons above jstree as if nothing selected
        // (but don't actually change selection in jstree).
        if (buttonsShowHide) {
            buttonsShowHide([]);
        }
    },

    handleIconClick: function(image, event) {
        // Might be a Dataset image OR a Well that is selected.
        let imageId = image.id;
        let wellId = image.wellId;
        if (wellId) {
            this.setSelectedWells([wellId]);
            return;
        }
        let jstree = this.props.jstree;
        let containerNode = OME.getTreeImageContainerBestGuess(imageId);

        let selIds = this.props.imgJson.filter(i => i.selected).map(i => i.id);
        let imgIds = this.props.imgJson.map(i => i.id);
        let clickedIndex = imgIds.indexOf(imageId);

        let toSelect = [];

        // handle shift
        if (event.shiftKey && selIds.length > 0) {
            // if any selected already, select range...
            let firstSelIndex = imgIds.indexOf(selIds[0]);
            let lastSelIndex = imgIds.indexOf(selIds[selIds.length - 1]);
            firstSelIndex = Math.min(firstSelIndex, clickedIndex);
            lastSelIndex = Math.max(lastSelIndex, clickedIndex);
            toSelect = imgIds.slice(firstSelIndex, lastSelIndex + 1);
        } else if (event.metaKey) {
            // handle Cmd -> toggle selection
            if (selIds.indexOf(imageId) === -1) {
                selIds.push(imageId)
                toSelect = selIds;
            } else {
                toSelect = selIds.filter(i => i !== imageId);
            }
        } else {
            // Only select clicked image
            toSelect = [imageId];
        }
        if (jstree) {
            jstree.deselect_all();
            let nodes = toSelect.map(iid => jstree.locate_node('image-' + iid, containerNode)[0]);
            jstree.select_node(nodes);
            // we also focus the node, so that hotkey events come from the node
            if (nodes.length > 0) {
                $("#" + nodes[0].id).children('.jstree-anchor').focus();
            }
        }
    },

    render() {
        let {imgJson, iconSize, tableData} = this.props;

        let xAxisName = this.state.xAxisName;
        let yAxisName = this.state.yAxisName;
        let selectedImageIds = this.state.selectedImageIds;

        // Available axes are dataTable keys.
        let axisNames = Object.keys(tableData);
        if (axisNames.length < 2) {
            return (<div>Choose more data to load</div>)
        }

        if (xAxisName !== undefined) {
            axisNames.splice(axisNames.indexOf(xAxisName), 1);
        }
        if (yAxisName !== undefined) {
            axisNames.splice(axisNames.indexOf(yAxisName), 1);
        }
        if (xAxisName == undefined) {
            xAxisName = axisNames[0];
            axisNames.splice(0, 1);
        }
        if (yAxisName == undefined) {
            yAxisName = axisNames[0];
        }
        axisNames = Object.keys(tableData);
        let dataRanges = axisNames.reduce((prev, name) => {
            let mn = Object.values(tableData[name]).reduce((p, v) => Math.min(p, v));
            let mx = Object.values(tableData[name]).reduce((p, v) => Math.max(p, v));
            prev[name] = [mn, mx]
            return prev;
        }, {});
        function getAxisPercent(name, value) {
            let minMax = dataRanges[name];
            let fraction = (value - minMax[0])/(minMax[1] - minMax[0]);
            return fraction * 100;
        }

        return (
            <div className="parade_centrePanel">
                <div className="thumbnail_plot">
                    <select onChange={(event) => {this.setAxisName('y', event, xAxisName)}}
                            value={yAxisName}
                            style={styles.yAxisSelect}>
                        {axisNames.map((n, i) => (<option key={i} value={n}> {n}</option>))}
                    </select>
                    <select onChange={(event) => {this.setAxisName('x', event, yAxisName)}}
                            value={xAxisName}
                            style={styles.xAxisSelect}>
                        {axisNames.map((n, i) => (<option key={i} value={n}> {n}</option>))}
                    </select>

                    <div className="thumbnail_plot_canvas" ref="thumb_plot_canvas">
                        {imgJson.map(image => (
                            <img alt="image"
                                className={selectedImageIds.indexOf(image.id) > -1 ? 'ui-selected' : ''}
                                key={image.id}
                                data-id={image.id}
                                data-wellId={image.wellId}
                                src={"/webgateway/render_thumbnail/" + image.id + "/"}
                                title={image.name}
                                onClick={event => {this.handleIconClick(image, event)}}

                                style={{left: getAxisPercent(xAxisName, tableData[xAxisName][image.id]) + '%',
                                        top: (100 - getAxisPercent(yAxisName, tableData[yAxisName][image.id])) + '%'}}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }
});
