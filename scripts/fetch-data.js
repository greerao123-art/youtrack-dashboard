const https = require('https');
const fs = require('fs');
const path = require('path');

const YOUTRACK_BASE_URL = 'https://work.qapita.com';
const YOUTRACK_API_TOKEN = process.env.perm-Z3JlZXNobWEucmFv.NTUtMTE=.MulwNy9x604Xs30GZcd6BIgXuG6dEk;

function makeRequest(queryPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'work.qapita.com',
      path: queryPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${YOUTRACK_API_TOKEN}`,
        'Accept': 'application/json'
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function fetchDashboardData() {
  try {
    const query = encodeURIComponent('(project: QAPMAP-Product-Support) and (created: 2026-08-01 .. *)');
    const fields = 'idReadable,summary,description,created,customFields(name,value(text,name,presentation)),comments(text,created,author(login))';
    const path = `/api/issues?query=${query}&fields=${fields}&$top=1000`;

    const response = await makeRequest(path);
    
    // Parse issues into clean format
    const issues = response.issue.map(issue => {
      const customFieldsMap = {};
      
      // Extract custom fields into a map for easy access
      issue.customFields.forEach(field => {
        let value = null;
        
        if (field.value) {
          if (Array.isArray(field.value)) {
            value = field.value.map(v => v.name || v).join(', ');
          } else if (typeof field.value === 'object') {
            value = field.value.name || field.value.text || JSON.stringify(field.value);
          } else {
            value = field.value;
          }
        }
        
        customFieldsMap[field.name] = value;
      });

      return {
        id: issue.idReadable,
        summary: issue.summary,
        description: issue.description,
        created: new Date(issue.created).toLocaleDateString(),
        processor: customFieldsMap['Processor'],
        platform: customFieldsMap['Platform'],
        serverName: customFieldsMap['Server Name'],
        clientName: customFieldsMap['Client Name'],
        freshdeskId: customFieldsMap['FreshDesk ID'],
        issuerId: customFieldsMap['Issuer ID'],
        priority: customFieldsMap['Priority'],
        state: customFieldsMap['State'],
        problemBucket: customFieldsMap['Problem Bucket'],
        rca: customFieldsMap['RCA'],
        issueType: customFieldsMap['Issue Type'],
        tags: customFieldsMap['Tags'],
        estimationOfEffort: customFieldsMap['Estimation of Effort'],
        assignee: customFieldsMap['Assignee'],
        qa: customFieldsMap['QA'],
        pr: customFieldsMap['PR'],
        releaseDate: customFieldsMap['Release Date'],
        techResponseTime: customFieldsMap['Tech Response Time'],
        csResponseTime: customFieldsMap['CS Response Time'],
        resolutionTime: customFieldsMap['Resolution Time'],
        csResponseStart: customFieldsMap['CS Response Start'],
        resolutionStart: customFieldsMap['Resolution Start'],
        estimation: customFieldsMap['Estimation'],
        criticalReason: customFieldsMap['Please mention why it is critical'],
        clientNameIssuerId: customFieldsMap['Client Name - Issuer Id'],
        commentCount: issue.comments ? issue.comments.length : 0,
        lastComment: issue.comments && issue.comments.length > 0 ? issue.comments[issue.comments.length - 1].text : null
      };
    });

    const dashboardData = {
      timestamp: new Date().toISOString(),
      totalIssues: issues.length,
      issues: issues,
      lastUpdated: new Date().toLocaleString()
    };

    // Ensure directory exists
    const dashboardDir = path.join(__dirname, '..', 'dashboard');
    if (!fs.existsSync(dashboardDir)) {
      fs.mkdirSync(dashboardDir, { recursive: true });
    }

    // Write data.json
    fs.writeFileSync(
      path.join(dashboardDir, 'data.json'),
      JSON.stringify(dashboardData, null, 2)
    );

    console.log(`✓ Dashboard data updated: ${issues.length} issues fetched`);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    process.exit(1);
  }
}

fetchDashboardData();
