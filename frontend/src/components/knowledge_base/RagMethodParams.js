import React, {useEffect, useState} from 'react';
import {Alert, Card, Collapse, Form, Input, InputNumber, Select, Slider, Spin, Switch, Tooltip, Typography} from 'antd';
import {InfoCircleOutlined, QuestionCircleOutlined} from '@ant-design/icons';
import {getMethodConfig, paramConstraints} from '../../config/ragConfig';

const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;

/**
 * RAG方法参数配置组件
 * @param {Object} props
 * @param {string} props.methodId - 当前选择的RAG方法ID
 * @param {Function} props.onChange - 参数变更时的回调函数
 * @param {boolean} props.showSearchParams - 是否显示搜索参数，默认为true
 * @param {boolean} props.showIndexParams - 是否显示索引参数，默认为true
 */
const RagMethodParams = ({ methodId, onChange, showSearchParams = true, showIndexParams = true }) => {
  const [loading, setLoading] = useState(false);
  const [methodDetails, setMethodDetails] = useState(null);
  const [formValues, setFormValues] = useState({});

  // 获取方法详情
  useEffect(() => {
    if (!methodId) {
      setMethodDetails(null);
      return;
    }

    setLoading(true);
    
    // 从前端配置中获取方法详情，不再调用API
    try {
      const method = getMethodConfig(methodId);
      if (method) {
        setMethodDetails(method);
        
        // 合并索引参数和搜索参数作为表单初始值
        // 根据showIndexParams和showSearchParams决定要包含的参数
        const initialValues = {
          ...(showIndexParams ? method.indexParams : {}),
          ...(showSearchParams ? method.searchParams : {})
        };
        
        setFormValues(initialValues);
        if (onChange) {
          onChange(initialValues);
        }
      }
    } catch (error) {
      console.error('获取RAG方法详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [methodId, showSearchParams]);

  // 处理参数值变更
  const handleParamChange = (paramName, value) => {
    const newValues = { ...formValues, [paramName]: value };
    setFormValues(newValues);
    if (onChange) {
      onChange(newValues);
    }
  };

  // 根据参数类型渲染对应的表单控件
  const renderParamField = (paramName, paramValue) => {
    // 根据参数名称和值类型确定要渲染的控件
    const paramType = typeof paramValue;
    
    // 从参数约束配置中获取配置
    const paramConfig = paramConstraints[paramName] || {};
    
    switch (paramConfig.type || paramType) {
      case 'number':
        return (
          <InputNumber
            value={formValues[paramName]}
            onChange={(value) => handleParamChange(paramName, value)}
            min={paramConfig.min}
            max={paramConfig.max}
            step={paramConfig.step || 1}
            style={{ width: '100%' }}
            addonAfter={paramConfig.unit}
          />
        );
      
      case 'boolean':
        return (
          <Switch
            checked={formValues[paramName]}
            onChange={(checked) => handleParamChange(paramName, checked)}
          />
        );
      
      case 'slider':
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Slider
              value={formValues[paramName]}
              onChange={(value) => handleParamChange(paramName, value)}
              min={paramConfig.min}
              max={paramConfig.max}
              step={paramConfig.step || 1}
              marks={paramConfig.marks}
              tooltip={{ formatter: (value) => `${value}` }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <InputNumber
                size="small"
                min={paramConfig.min}
                max={paramConfig.max}
                value={formValues[paramName]}
                onChange={(value) => handleParamChange(paramName, value)}
                style={{ width: '60px' }}
              />
              {paramConfig.unit && <Text type="secondary">{paramConfig.unit}</Text>}
            </div>
          </div>
        );
        
      case 'select':
        return (
          <Select
            value={formValues[paramName]}
            onChange={(value) => handleParamChange(paramName, value)}
            style={{ width: '100%' }}
            options={paramConfig.options}
          />
        );
      
      case 'string':
        return (
          <Input
            value={formValues[paramName]}
            onChange={(e) => handleParamChange(paramName, e.target.value)}
            placeholder={paramConfig.placeholder}
          />
        );
        
      default:
        return (
          <Input
            value={JSON.stringify(formValues[paramName])}
            onChange={(e) => {
              try {
                const value = JSON.parse(e.target.value);
                handleParamChange(paramName, value);
              } catch (error) {
                handleParamChange(paramName, e.target.value);
              }
            }}
          />
        );
    }
  };

  // 获取参数的显示名称
  const getParamDisplayName = (paramName) => {
    const config = paramConstraints[paramName];
    if (config && config.displayName) {
      return config.displayName;
    }
    
    // 将kebab-case转换为更友好的显示格式
    return paramName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // 获取参数的描述
  const getParamDescription = (paramName) => {
    const config = paramConstraints[paramName];
    if (config && config.description) {
      return config.description;
    }
    
    return `${getParamDisplayName(paramName)}参数`;
  };
  
  // 获取参数的示例说明
  const getParamExample = (paramName) => {
    const config = paramConstraints[paramName];
    return config && config.example ? config.example : null;
  };

  if (loading) {
    return <Spin tip="加载参数配置..." />;
  }

  if (!methodId || !methodDetails) {
    return <Alert type="info" message="请先选择一种RAG方法" />;
  }

  // 确定默认展开的面板
  const defaultActiveKeys = [];
  if (showIndexParams) defaultActiveKeys.push('indexParams');
  if (showSearchParams) defaultActiveKeys.push('searchParams');

  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{methodDetails.name} 参数配置</span>
          <Tooltip title={methodDetails.description}>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </div>
      }
      bodyStyle={{ padding: '12px 24px' }}
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {methodDetails.description}
      </Paragraph>
      
      {/* 直接显示参数，不使用Collapse */}
      {showIndexParams && Object.keys(methodDetails.indexParams || {}).length > 0 && (
        <div className="param-section" style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginBottom: 8 }}>索引参数</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            这些参数影响文档如何被分割和索引，对检索效果有重要影响
          </Paragraph>
          
          <Form layout="vertical">
            {Object.entries(methodDetails.indexParams || {}).map(([paramName, paramValue]) => {
              const example = getParamExample(paramName);
              return (
                <Form.Item 
                  key={`index-${paramName}`}
                  label={
                    <span>
                      {getParamDisplayName(paramName)} 
                      <Tooltip title={getParamDescription(paramName)}>
                        <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                      </Tooltip>
                    </span>
                  }
                  tooltip={example}
                  extra={example && <Text type="secondary" style={{ fontSize: '12px' }}>{example}</Text>}
                >
                  {renderParamField(paramName, paramValue)}
                </Form.Item>
              );
            })}
          </Form>
        </div>
      )}
      
      {showSearchParams && Object.keys(methodDetails.searchParams || {}).length > 0 && (
        <div className="param-section">
          <Title level={5} style={{ marginBottom: 8 }}>搜索参数</Title>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            这些参数决定了如何检索相关文档片段并生成回答
          </Paragraph>
          
          <Form layout="vertical">
            {Object.entries(methodDetails.searchParams || {}).map(([paramName, paramValue]) => {
              const example = getParamExample(paramName);
              return (
                <Form.Item 
                  key={`search-${paramName}`}
                  label={
                    <span>
                      {getParamDisplayName(paramName)}
                      <Tooltip title={getParamDescription(paramName)}>
                        <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                      </Tooltip>
                    </span>
                  }
                  tooltip={example}
                  extra={example && <Text type="secondary" style={{ fontSize: '12px' }}>{example}</Text>}
                >
                  {renderParamField(paramName, paramValue)}
                </Form.Item>
              );
            })}
          </Form>
        </div>
      )}
    </Card>
  );
};

export default RagMethodParams;