import React, { PureComponent } from 'react';
import { View, Text, Image, ViewPropTypes } from 'react-native';
import PropTypes from 'prop-types';
import ViewTransformer from '../ViewTransformer';
import { captureRef, captureScreen } from "react-native-view-shot";

export default class TransformableImage extends PureComponent {
    static propTypes = {
        image: PropTypes.shape({
            source: PropTypes.oneOfType([
                PropTypes.object,
                PropTypes.number
            ]).isRequired,
            dimensions: PropTypes.shape({ width: PropTypes.number, height: PropTypes.number })
        }).isRequired,
        style: ViewPropTypes ? ViewPropTypes.style : View.propTypes.style,
        onLoad: PropTypes.func,
        onLoadStart: PropTypes.func,
        enableTransform: PropTypes.bool,
        enableScale: PropTypes.bool,
        enableTranslate: PropTypes.bool,
        onTransformGestureReleased: PropTypes.func,
        onViewTransformed: PropTypes.func,
        imageComponent: PropTypes.func,
        resizeMode: PropTypes.string,
        errorComponent: PropTypes.func
    };

    static defaultProps = {
        enableTransform: true,
        enableScale: true,
        enableTranslate: true,
        imageComponent: undefined,
        resizeMode: 'contain'
    };

    constructor(props) {
        super(props);

        this.onLayout = this.onLayout.bind(this);
        this.onLoad = this.onLoad.bind(this);
        this.onLoadStart = this.onLoadStart.bind(this);
        this.getViewTransformerInstance = this.getViewTransformerInstance.bind(this);
        this.renderError = this.renderError.bind(this);

        this.state = {
            viewWidth: 0,
            viewHeight: 0,
            imageLoaded: false,
            imageDimensions: props.image.dimensions,
            keyAcumulator: 1,
            snapValue: { // for snap-view
                format: 'jpg',
                quality: 1.0,
                result: 'tmpfile',
                snapshotContentContainer: false
            }
        };
    }

    componentWillMount() {
        if (!this.state.imageDimensions) {
            this.getImageSize(this.props.image);
        }
    }

    componentDidMount() {
        this._mounted = true;
    }

    componentWillReceiveProps(nextProps) {
        if (!sameImage(this.props.image, nextProps.image)) {
            // image source changed, clear last image's imageDimensions info if any
            this.setState({ imageDimensions: nextProps.image.dimensions, keyAcumulator: this.state.keyAcumulator + 1 });
            if (!nextProps.image.dimensions) { // if we don't have image dimensions provided in source
                this.getImageSize(nextProps.image);
            }
        }
    }

    componentWillUnmount() {
        this._mounted = false;
    }

    onLoadStart(e) {
        this.props.onLoadStart && this.props.onLoadStart(e);
        if (this.state.imageLoaded) {
            this.setState({ imageLoaded: false });
        }
    }

    onLoad(e) {
        this.props.onLoad && this.props.onLoad(e);
        if (!this.state.imageLoaded) {
            this.setState({ imageLoaded: true });
        }
    }

    onLayout(e) {
        let { width, height } = e.nativeEvent.layout;
        if (this.state.viewWidth !== width || this.state.viewHeight !== height) {
            this.setState({ viewWidth: width, viewHeight: height });
        }
    }

    getImageSize(image) {
        if (!image) {
            return;
        }
        const { source, dimensions } = image;

        if (dimensions) {
            this.setState({ imageDimensions: dimensions });
            return;
        }

        if (source && source.uri) {
            Image.getSize(
                source.uri,
                (width, height) => {
                    if (width && height) {
                        if (this.state.imageDimensions && this.state.imageDimensions.width === width && this.state.imageDimensions.height === height) {
                            // no need to update state
                        } else {
                            this._mounted && this.setState({ imageDimensions: { width, height } });
                        }
                    }
                },
                () => {
                    this._mounted && this.setState({ error: true });
                }
            );
        } else {
            console.warn('react-native-image-gallery', 'Please provide dimensions of your local images');
        }
    }

    getViewTransformerInstance() {
        return this.refs['viewTransformer'];
    }

    renderError() {
        return (this.props.errorComponent && this.props.errorComponent()) || (
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 15, fontStyle: 'italic' }}>This image cannot be displayed...</Text>
            </View>
        );
    }

    //snapshot = refname => () => {
    snapshot(refname, snapRefId) {
        return new Promise(resolve => {
            //alert('know');
            (refname
                ? captureRef(this.refs[refname], this.state.snapValue)
                : captureScreen(this.state.snapValue)
            ).then(
                res =>
                    this.state.snapValue.result !== "tmpfile"
                        ? res
                        : new Promise((success, failure) =>
                            // just a test to ensure res can be used in Image.getSize
                            Image.getSize(
                                res,
                                (width, height) => (
                                    //sucess(res)
                                    console.log(res, width, height), success(res)
                                ),
                                failure
                            )
                        )
                )
                .then(res => {
                    //console.log('res here', snapRefId, res);
                    resolve(res);
                    //alert('res here')
                    //resolve(snapRefId, res);
                    //alert(res)
                    //this.props.onSnapChange(snapRefId, res);
                    // this.setState({
                    //     error: null,
                    //     res,
                    //     previewSource: {
                    //         uri:
                    //         this.state.value.result === "base64"
                    //             ? "data:image/" + this.state.value.format + ";base64," + res
                    //             : res
                    //     }
                    // })
                }
                )
                .catch(
                error => (
                    console.warn(error)//,
                    //this.setState({ error, res: null, previewSource: null })
                )
                );
        });

    }

    getCurrentSnapView = (snapRefId) => {
        //console.log('area');
        //console.log(this.snapArea);
        //alert('he');
        // return (
        return new Promise(resolve => {
            this.snapshot('viewTransformer', snapRefId).then(res => {
                //console.log('check2', a);
                resolve(res);
            })
        });

        // );
    }

    // getAvailablePanSpace = () => {
    //     return this.getViewTransformerInstance().getAvailablePanSpace();
    // }

    render() {
        const { imageDimensions, viewWidth, viewHeight, error, keyAccumulator, imageLoaded } = this.state;
        const { style, image, imageComponent, resizeMode, enableTransform, enableScale, enableTranslate, onTransformGestureReleased, onViewTransformed } = this.props;

        //let maxScale = this.props.maxScale; //1;
        let contentAspectRatio;
        let width, height; // imageDimensions

        if (imageDimensions) {
            width = imageDimensions.width;
            height = imageDimensions.height;
        }

        if (width && height) {
            contentAspectRatio = width / height;
            // if (viewWidth && viewHeight) {
            //     maxScale = Math.max(width / viewWidth, height / viewHeight);
            //     maxScale = Math.max(1, maxScale);
            // }
        }

        const imageProps = {
            ...this.props,
            imageLoaded,
            source: image.source,
            style: [style, { backgroundColor: 'transparent' }],
            resizeMode: resizeMode,
            onLoadStart: this.onLoadStart,
            onLoad: this.onLoad,
            capInsets: { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 }
        };

        const content = imageComponent ? imageComponent(imageProps, imageDimensions) :
            // <View ref='snapArea' collapsable={false} style={{ width: style.width, height: style.height }}>
            <Image { ...imageProps } />
            // </View>
            ;

        return (
            <ViewTransformer
                collapsable={false} // ART
                ref={'viewTransformer'}
                key={'viewTransformer#' + keyAccumulator} // when image source changes, we should use a different node to avoid reusing previous transform state
                enableTransform={enableTransform && imageLoaded} // disable transform until image is loaded
                enableScale={enableScale}
                enableTranslate={enableTranslate}
                enableResistance={true}
                onTransformGestureReleased={onTransformGestureReleased}
                onViewTransformed={onViewTransformed}
                //maxScale={maxScale}
                contentAspectRatio={contentAspectRatio}
                onLayout={this.onLayout}
                //ART
                initScale={this.props.initScale} //ART
                minScale={this.props.minScale}
                maxScale={this.props.maxScale}
                initTranslateX={this.props.initTranslateX}
                initTranslateY={this.props.initTranslateY}
                style={style}>
                {error ? this.renderError() : content}
            </ViewTransformer>
        );
    }
}

function sameImage(source, nextSource) {
    if (source === nextSource) {
        return true;
    }
    if (source && nextSource) {
        if (source.uri && nextSource.uri) {
            return source.uri === nextSource.uri;
        }
    }
    return false;
}
