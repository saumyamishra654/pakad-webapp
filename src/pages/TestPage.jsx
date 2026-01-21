import React from 'react';

const TestPage = () => {
    console.log("TestPage rendering");
    return (
        <div style={{ padding: '50px', textAlign: 'center', color: 'white' }}>
            <h1>Test Page Works!</h1>
            <p>If you see this, React is mounting correctly.</p>
        </div>
    );
};

export default TestPage;
