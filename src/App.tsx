import React from 'react';
import logo from './logo.svg';
import './App.css';
import data from './data.json';

const TOP_MARGIN = 15;
const LEFT_MARGIN = 30;

type NodePos = {
    // How far down it is vertically
    deviance: number,
    // How far it is horizontally
    depth: number
};

type Edge = {
    source: NodePos,
    dest: NodePos,
};

type EdgeBoxProps = {
    edge: Edge,
};
function EdgeBox({ edge }: EdgeBoxProps) {
    let isBotRight = edge.dest.deviance < edge.source.deviance;
    return (
        <div className="edge" style={{
            position: 'absolute',
            top: TOP_MARGIN * Math.min(edge.source.deviance, edge.dest.deviance) + 'rem',
            left: LEFT_MARGIN * Math.min(edge.source.depth, edge.dest.depth) + 'rem',
            height: TOP_MARGIN * Math.abs(edge.dest.deviance - edge.source.deviance) + 'rem',
            width: LEFT_MARGIN * Math.abs(edge.dest.depth - edge.source.depth) + 'rem',
            background: `linear-gradient(to ${isBotRight ? 'bottom right' : 'top right'},
        transparent 49.9%, gray 49.9%,
        gray 50.1%, transparent 50.1%)`,
            margin: !isBotRight ? '1em 0 0 1em' : '6em 0 0 1em'
        }}></div>
    );
}

type GraphNodeProps = { pos: NodePos, hash: string; author: string; branch: string; data: TransData, outEdges: Edge[] };
function GraphNode({ data, ...props }: GraphNodeProps) {
    console.log(props.outEdges);
    return (
        <>
            <div className="node" style={{
                position: 'absolute', 
                top: TOP_MARGIN * props.pos.deviance + 'rem',
                left: LEFT_MARGIN * props.pos.depth + 'rem',
            }}>
                {props.branch !== 'master' ? 'Pull Request\n' : ''} 
                {props.hash}{'\n'}
                author: {props.author} ({'recipients' in data ? -data.recipients.reduce((s,e) => s + e.amount, 0) : 0}){'\n'}
                targets:{'\n'}
                {'recipients' in data ? data.recipients.map(({ amount, name }) => `${name} (+${amount})`).join('\n') : 
                    data.registered ? `registered ${props.author}` : 'root commit'}
            </div>
            {props.outEdges.map((edge,i) => <EdgeBox key={i} edge={edge} />)}
        </>
    );
}

type TransData = {
    recipients: { name: string, amount: number }[];
} | { registered: boolean };

type Commit = {
    hash: string;
    author: string;
    branch: string;
    data: TransData;
} & ({ children: Commit[]; } | { mergedInto: number });

type GraphProps = {
    root: Commit;
};
function Graph({ root }: GraphProps) {
    // BFS
    let layer: Commit[] = [root],
        nodes: GraphNodeProps[] = [],
        depth = 0;
    while(layer.length > 0) {
        let newLayer = [];
        for(let deviance = 0; deviance < layer.length; deviance++) {
            let node = layer[deviance];
            let source = {
                deviance,
                depth
            };
            let outEdges = [];
            if('children' in node) {
                for(let child of node.children) {
                    outEdges.push({
                        source,
                        dest: {
                            depth: depth+1,
                            deviance: newLayer.length
                        }
                    });
                    newLayer.push(child);
                }
            } else {
                outEdges.push({
                    source,
                    dest: {
                        deviance: 0,
                        depth: node.mergedInto+1
                    }
                });
            }
            nodes.push({
                hash: node.hash,
                author: node.author,
                branch: node.branch,
                data: node.data,
                pos: source,
                outEdges
            });
        }
        depth++;
        layer = newLayer;
    }
    return (
        <div className="graph" style={{position: 'absolute', top: '3rem', left: 0}}>
            {nodes.map((node,i) => <GraphNode key={i} {...node} />)}
        </div>
    );
}

let fakeGraph: GraphProps = {
    root: {
        hash: 'a'.repeat(40),
        author: 'virchau13',
        branch: 'give-smjleo-1-coin',
        data: { recipients: [{ name: 'smjleo', amount: 1 }] },
        children: [{
            hash: 'b'.repeat(40),
            author: 'smjleo',
            branch: 'give-virchau13-his-coin-back',
            data: { recipients: [{ name: 'virchau13', amount: 1 }] },
            children: [{
                hash: 'c'.repeat(40),
                author: 'virchau13',
                branch: 'give-smjleo-2-coins-for-his-generosity',
                data: { recipients: [{ name: 'smjleo', amount: 2 }] },
                children: []
            }]
        }, {
            hash: 'd'.repeat(40),
            author: 'smjleo',
            branch: 'actually-i-change-my-mind-i-give-2',
            data: { recipients: [{ name: 'virchau13', amount: 2 }] },
            children: []
        }]
    }
};

let realGraph: GraphProps = {
    root: data,
};

function App() {
    return (
        <div className="App">
            <h2 style={{margin: '2rem 3rem'}}>GHCoin Chain Visualization</h2>
            <Graph {...realGraph} />
        </div>
    );
}

export default App;
