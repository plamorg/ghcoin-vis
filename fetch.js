let fs = require('fs');

let token = /* don't commit this, put your api token here */ "";

let fetchOpts = {
    headers: {
        authorization: "token " + token
    }
};

async function procCommit(hash, prNr, depth) {
    let diff = (await fetch('https://api.github.com/repos/plamorg/ghcoin/pulls/' + prNr, {
        headers: {
            accept: 'application/vnd.github.v3.diff',
            authorization: "token " + token,
        }
    }).then(x => x.text())).split('\n');
    let removed = Object.fromEntries(diff.filter(line => line[0] === '-' && !line.startsWith('--')).map(x => x.slice(1).split(',')));
    let added = Object.fromEntries(diff.filter(line => line[0] === '+' && !line.startsWith('++')).map(x => x.slice(1).split(',')));
    let registered = false;
    let recipients = [];
    let author;
    for(let name in added) {
        if(removed[name] == null) {
            // user added
            registered = true;
            break;
        }
        let amount = parseInt(added[name]) - parseInt(removed[name]);
        if(amount < 0) {
            author = name;
        } else {
            recipients.push({ name, amount });
        }
    }
    let data = registered ? { registered } : { recipients };
    let prRet = { data, branch: 'idk', hash, author, mergedInto: depth };
    let mainRet = { data, branch: 'master', hash, author };
    return [mainRet, prRet];
}

async function run() {
    return (async () => {
        let raw = (await fetch('https://api.github.com/repos/plamorg/ghcoin/commits?per_page=100', fetchOpts).then(d => d.json()));
        raw = raw.filter(commit => commit.commit.message.startsWith('ghcoin:'));
        let commits = [];
        for(const commit of raw) {
            commits.push(commit);
            if(commit.commit.message === 'ghcoin: root') break;
        }
        commits.reverse();
        return [{
            hash: commits[0].sha,
            author: commits[0].commit.author.name,
            branch: 'master',
            data: { registered: false /* specially marks root commit */},
        }, ...await Promise.all(commits.slice(1).map((commit,i) => procCommit(commit.sha, commit.commit.message.match(/ghcoin: process transaction (\d+)/)[1], i+1)))];
    })().then(commits => {
        commits[commits.length-1][0].children = [];
        for(let i = commits.length-1; i >= 2; i--) {
            commits[i-1][0].children = commits[i];
        }
        commits[0].children = commits[1];
        return commits[0];
    });
}

run().then(commit => fs.writeFileSync('data.json', JSON.stringify(commit)));
