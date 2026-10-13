# uenoseisou2.3 プロジェクト運用ルール

## 1. 動作・実行ポリシー
- **確認なしで即座に実行する**:
  ファイルの新規作成・編集・更新・削除、各種スクリプトやコマンドの実行など、事前の許可確認や承認待ちを挟まず、指示を受けた時点で一気に実行する。
- **ローカル確認後にPush（厳守）**:
  スクリプトやHTMLの構文チェック・動作シミュレーション検証を実施してからGit PushおよびGoogle Drive同期を行う。

## 2. Google Drive 同期先ルール（両方のアカウントへ常時同期）
以下の2つのGoogle Driveアカウント両方に対して常に同期（完全反映・MD5検証）を行うこと：
1. `/Users/annsyuu/Library/CloudStorage/GoogleDrive-kankyoubu.itaku@gmail.com/マイドライブ/uenoseisou2.3/`
2. `/Users/annsyuu/Library/CloudStorage/GoogleDrive-annsyuu38@gmail.com/マイドライブ/uenoseisou2.3/`
