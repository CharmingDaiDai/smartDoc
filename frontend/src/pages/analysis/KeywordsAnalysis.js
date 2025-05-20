import React, {useState} from "react";
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    Divider,
    Input,
    message,
    Modal,
    Radio,
    Row,
    Skeleton,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import {
    CheckCircleOutlined,
    CopyOutlined,
    FileTextOutlined,
    HighlightOutlined,
    InfoCircleOutlined,
    LoadingOutlined,
    TagsOutlined,
} from "@ant-design/icons";
import {documentAPI} from "../../services/api";
import DocumentSelector from "../../components/analysis/DocumentSelector";

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// 彩色关键词标签颜色数组 - 用于随机分配颜色
const TAG_COLORS = [
  "blue",
  "cyan",
  "geekblue",
  "purple",
  "magenta",
  "green",
  "lime",
  "orange",
];

const KeywordsAnalysis = () => {
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputType, setInputType] = useState("text"); // 'text' 或 'document'
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [analyzeCount, setAnalyzeCount] = useState(0);

  // 处理文本输入变化
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  // 处理输入类型变化
  const handleInputTypeChange = (e) => {
    setInputType(e.target.value);
    // 清空错误消息
    setError("");
  };

  // 处理文档选择
  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
    // 清空错误消息
    setError("");
  };

  // 处理查看已有结果
  const handleViewResult = (document) => {
    setViewingDocument(document);
    setResultModalVisible(true);
  };

  // 关闭结果查看模态框
  const handleCloseResultModal = () => {
    setResultModalVisible(false);
  };

  // 处理复制关键词
  const handleCopyKeywords = () => {
    const keywordsToCopy =
      keywords.length > 0
        ? keywords.join(", ")
        : viewingDocument?.keywords?.join(", ") || "";

    if (!keywordsToCopy) {
      message.warning("没有可复制的关键词");
      return;
    }

    navigator.clipboard
      .writeText(keywordsToCopy)
      .then(() => message.success("已复制到剪贴板"))
      .catch(() => message.error("复制失败，请手动复制"));
  };

  // 提取关键词
  const extractKeywords = async () => {
    // 基于输入类型验证输入
    if (inputType === "text" && !content.trim()) {
      setError("请输入文档内容");
      return;
    } else if (inputType === "document" && !selectedDocument) {
      setError("请选择一个文档");
      return;
    }

    setLoading(true);
    setError("");
    try {
      let response;

      if (inputType === "text") {
        // 使用文本内容提取关键词
        response = await documentAPI.extractKeywords(content);
      } else {
        // 使用文档ID提取关键词
        response = await documentAPI.extractKeywordsFromDocument(
          selectedDocument.id
        );
      }

      setKeywords(response.data.keywords || []);
      setAnalyzeCount((prev) => prev + 1);
      setLoading(false);
    } catch (err) {
      console.error("提取关键词失败:", err);
      setError("提取关键词失败，请稍后再试");
      setLoading(false);
    }
  };

  // 清空所有内容
  const handleClear = () => {
    setContent("");
    setKeywords([]);
    setError("");
    setSelectedDocument(null);
  };

  // 渲染关键词标签 - 改进版本，添加更多视觉效果
  const renderKeywordTags = (keywordList) => {
    // 确保keywordList是数组
    if (
      !keywordList ||
      keywordList.length === 0 ||
      !Array.isArray(keywordList)
    ) {
      // 如果不是数组但又有内容，尝试转换为数组
      if (keywordList && !Array.isArray(keywordList)) {
        try {
          // 如果是字符串，可能是逗号分隔的关键词
          if (typeof keywordList === "string") {
            const keywordsArray = keywordList
              .split(",")
              .map((k) => k.trim())
              .filter((k) => k);
            if (keywordsArray.length > 0) {
              return renderTagCloud(keywordsArray);
            }
          }
        } catch (err) {
          console.error("关键词转换失败:", err);
        }
      }

      // 如果没有关键词，显示空状态
      return (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            background: "#f9f9f9",
            borderRadius: "8px",
          }}
        >
          <HighlightOutlined
            style={{ fontSize: "48px", color: "#bfbfbf", marginBottom: "16px" }}
          />
          <div>
            <Text type="secondary">暂无关键词</Text>
          </div>
        </div>
      );
    }

    // 渲染标签云
    return renderTagCloud(keywordList);
  };

  // 渲染标签云
  const renderTagCloud = (keywords) => {
    // 对关键词进行重要性排序
    const importantKeywords = keywords.slice(0, Math.min(3, keywords.length));
    const normalKeywords = keywords.slice(Math.min(3, keywords.length));

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">主要关键词</Text>
          <Divider style={{ margin: "8px 0 16px" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {importantKeywords.map((keyword, index) => (
              <Tag
                color={TAG_COLORS[index % TAG_COLORS.length]}
                key={index}
                style={{
                  fontSize: "16px",
                  padding: "6px 12px",
                  fontWeight: 500,
                  margin: 0,
                  borderRadius: "16px",
                }}
              >
                <HighlightOutlined style={{ marginRight: 5 }} /> {keyword}
              </Tag>
            ))}
          </div>
        </div>

        {normalKeywords.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Text type="secondary">次要关键词</Text>
            <Divider style={{ margin: "8px 0 16px" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {normalKeywords.map((keyword, index) => (
                <Tag
                  color={
                    TAG_COLORS[
                      (index + importantKeywords.length) % TAG_COLORS.length
                    ]
                  }
                  key={index + importantKeywords.length}
                  style={{
                    padding: "4px 8px",
                    margin: 0,
                    borderRadius: "12px",
                  }}
                >
                  {keyword}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, #722ed1 0%, #9254de 100%)",
          borderRadius: "12px",
          padding: "24px",
          color: "white",
          boxShadow: "0 4px 12px rgba(114, 46, 209, 0.15)",
        }}
      >
        <Title level={2} style={{ color: "white", margin: 0 }}>
          关键词提取
        </Title>
        <Paragraph
          style={{
            color: "rgba(255, 255, 255, 0.85)",
            fontSize: "16px",
            marginBottom: 0,
          }}
        >
          自动分析文档内容，提取最能代表文档主题和核心信息的关键词。
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  icon={<HighlightOutlined />}
                  style={{ backgroundColor: "#722ed1", marginRight: 8 }}
                />
                <span>内容输入</span>
              </div>
            }
            style={{
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              height: "100%",
            }}
          >
            <Radio.Group
              value={inputType}
              onChange={handleInputTypeChange}
              style={{ marginBottom: 16 }}
              buttonStyle="solid"
            >
              <Radio.Button value="text">
                <FileTextOutlined /> 直接输入文本
              </Radio.Button>
              <Radio.Button value="document">
                <TagsOutlined /> 选择已上传文档
              </Radio.Button>
            </Radio.Group>

            {inputType === "text" ? (
              <div>
                <TextArea
                  value={content}
                  onChange={handleContentChange}
                  placeholder="请在此输入或粘贴需要提取关键词的文档内容..."
                  autoSize={{ minRows: 8, maxRows: 16 }}
                  style={{
                    marginBottom: 16,
                    borderRadius: "8px",
                    borderColor: "#d9d9d9",
                  }}
                />
              </div>
            ) : (
              <div>
                <DocumentSelector
                  onSelect={handleDocumentSelect}
                  title="选择要提取关键词的文档"
                  emptyText="暂无可分析的文档，请先上传文档"
                  analysisType="keywords"
                  onViewResult={handleViewResult}
                />
              </div>
            )}

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginBottom: 16, borderRadius: "8px" }}
              />
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <Space>
                <Tooltip title="开始提取关键词">
                  <Button
                    type="primary"
                    onClick={extractKeywords}
                    loading={loading}
                    icon={<TagsOutlined />}
                    style={{
                      borderRadius: "6px",
                      boxShadow: "0 2px 6px rgba(114, 46, 209, 0.2)",
                    }}
                  >
                    提取关键词
                  </Button>
                </Tooltip>
                <Tooltip title="清空当前内容">
                  <Button onClick={handleClear} style={{ borderRadius: "6px" }}>
                    清空
                  </Button>
                </Tooltip>
              </Space>

              {(analyzeCount > 0 || keywords.length > 0) && (
                <Badge count={analyzeCount} offset={[0, 4]}>
                  <Text type="secondary">已分析 {analyzeCount} 次</Text>
                </Badge>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  icon={<InfoCircleOutlined />}
                  style={{ backgroundColor: "#1890ff", marginRight: 8 }}
                />
                <span>功能说明</span>
              </div>
            }
            style={{
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
              marginBottom: 24,
            }}
          >
            <div style={{ padding: "0 8px" }}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>关键词提取</Text>
                <Paragraph style={{ margin: "8px 0 0" }}>
                  通过AI算法分析文本内容，自动识别并提取出文档中最具有代表性的关键词，帮助您快速了解文档主题。
                </Paragraph>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text strong>使用方法</Text>
                <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
                  <li>直接输入或粘贴文本</li>
                  <li>或选择已上传的文档</li>
                  <li>点击"提取关键词"按钮开始分析</li>
                </ul>
              </div>

              <div>
                <Text strong>应用场景</Text>
                <ul style={{ paddingLeft: "20px", marginTop: "8px" }}>
                  <li>学术文章关键词提取</li>
                  <li>内容标签自动生成</li>
                  <li>文本主题快速识别</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card
            title={
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  icon={<CheckCircleOutlined />}
                  style={{ backgroundColor: "#52c41a", marginRight: 8 }}
                />
                <span>提示</span>
              </div>
            }
            style={{
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Paragraph>
              输入的文本内容越完整，提取的关键词准确度越高。对于长篇文章，建议选择文档上传方式，以获得更好的结果。
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {loading && (
        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            padding: "40px",
            background: "#f9f9f9",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Spin
            indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />}
            tip={
              <div style={{ marginTop: 16, color: "#8c8c8c" }}>
                正在分析文本内容，提取关键词...
              </div>
            }
          />
        </div>
      )}

      {!loading && keywords.length > 0 && (
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center" }}>
              <Avatar
                icon={<TagsOutlined />}
                style={{ backgroundColor: "#722ed1", marginRight: 8 }}
              />
              <span>关键词提取结果</span>
            </div>
          }
          extra={
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopyKeywords}
            >
              复制
            </Button>
          }
          style={{
            marginTop: 24,
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          }}
        >
          {renderKeywordTags(keywords)}
        </Card>
      )}

      {/* 已有结果查看模态框 */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            <Avatar
              icon={<TagsOutlined />}
              style={{ backgroundColor: "#722ed1", marginRight: 8 }}
            />
            <span>关键词：{viewingDocument?.title || ""}</span>
          </div>
        }
        open={resultModalVisible}
        onCancel={handleCloseResultModal}
        footer={[
          <Button
            key="copy"
            type="primary"
            onClick={handleCopyKeywords}
            icon={<CopyOutlined />}
            style={{ borderRadius: "6px" }}
          >
            复制关键词
          </Button>,
          <Button
            key="close"
            onClick={handleCloseResultModal}
            style={{ borderRadius: "6px" }}
          >
            关闭
          </Button>,
        ]}
        width={700}
        styles={{
          body: {
            padding: "24px",
          },
        }}
        style={{ top: 20 }}
      >
        {viewingDocument ? (
          <div>
            <Card
              style={{
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.09)",
              }}
            >
              {renderKeywordTags(viewingDocument.keywords || [])}
            </Card>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  icon={<FileTextOutlined />}
                  size="small"
                  style={{ backgroundColor: "#f9f9f9", marginRight: 8 }}
                />
                <Text type="secondary">
                  文档信息: {viewingDocument.fileName} (
                  {formatFileSize(viewingDocument.fileSize)})
                </Text>
              </div>
            </div>
          </div>
        ) : (
          <Skeleton active />
        )}
      </Modal>
    </div>
  );
};

// 格式化文件大小的辅助函数
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default KeywordsAnalysis;